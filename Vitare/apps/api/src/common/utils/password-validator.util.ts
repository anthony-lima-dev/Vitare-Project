/**
 * Motor de política de senha — validação flexível e de alta performance.
 *
 * Estratégia: uma ÚNICA passada (O(N)) sobre os code points da string,
 * acumulando os critérios de complexidade atendidos em uma bitmask de 4 bits.
 * Isso substitui múltiplos `RegExp.test()` independentes (cada um O(N)) por um
 * único laço e elimina qualquer risco de catastrophic backtracking.
 *
 * Short-circuit: assim que a quantidade mínima de critérios exigida é
 * satisfeita, o laço é interrompido imediatamente — o restante da string não é
 * classificado. O gate de tamanho (`value.length`) é checado antes da varredura
 * (O(1) em JS), evitando scan inútil para senhas curtas.
 *
 * Este módulo é intencionalmente livre de dependências de framework
 * (Nest/class-validator), o que o torna reutilizável, testável isoladamente e
 * adequado ao núcleo de domínio. A ponte com o `ConfigService` é feita pelo
 * decorator `@IsFlexiblePassword`, que injeta o ambiente resolvido.
 */

/** Chaves de ambiente mapeadas em `src/config/configuration.ts`. */
export const PASSWORD_MIN_LENGTH_ENV_KEY = 'PASSWORD_MIN_LENGTH';
export const PASSWORD_MIN_RULES_ENV_KEY = 'PASSWORD_MIN_RULES';

/** Fallbacks estáticos seguros, usados quando as envs não estão declaradas. */
export const DEFAULT_PASSWORD_MIN_LENGTH = 8;
export const DEFAULT_PASSWORD_MIN_RULES = 2;
/** Limite real do bcrypt, medido em bytes UTF-8, não em code units. */
export const PASSWORD_MAX_UTF8_BYTES = 72;

/** Quantidade total de critérios de complexidade disponíveis (4). */
export const PASSWORD_COMPLEXITY_RULE_COUNT = 4;

/** Piso absoluto de tamanho: evita política degenerada via env inválida. */
const MIN_ALLOWED_LENGTH = 1;

/**
 * Flags da bitmask de complexidade. Cada critério ocupa um bit distinto,
 * permitindo (a) detectar em O(1) se um critério já foi contabilizado via
 * `satisfiedFlags & flag` e (b) contar os atendidos sem tocar em regex.
 */
export const PasswordComplexityFlag = {
  LOWERCASE: 1 << 0, // 0b0001
  UPPERCASE: 1 << 1, // 0b0010
  DIGIT: 1 << 2, // 0b0100
  SPECIAL: 1 << 3, // 0b1000
} as const;

export type PasswordComplexityFlag =
  (typeof PasswordComplexityFlag)[keyof typeof PasswordComplexityFlag];

/** Política configurável aceita pelo decorator `@IsFlexiblePassword`. */
export interface PasswordValidatorOptions {
  /** Tamanho mínimo exigido (default: 8). */
  minLength?: number;
  /** Critérios mínimos exigidos, de 1 a 4 (default: 2). */
  minRules?: number;
}

/** Política já saneada, com todos os campos obrigatórios. */
export interface ResolvedPasswordValidatorOptions {
  minLength: number;
  minRules: number;
}

/** Bag de valores crus vindos de env/`ConfigService` (string ou número). */
export interface PasswordPolicyEnvironment {
  minLength?: string | number | null;
  minRules?: string | number | null;
}

/** Descrição legível dos critérios corporativos de complexidade. */
export const PASSWORD_COMPLEXITY_CRITERIA_DESCRIPTION =
  'letra minúscula, letra maiúscula, dígito numérico e caractere especial';

/** Lê os valores brutos das variáveis de ambiente da política de senha. */
export function readPasswordPolicyEnvironment(): PasswordPolicyEnvironment {
  return {
    minLength: process.env[PASSWORD_MIN_LENGTH_ENV_KEY],
    minRules: process.env[PASSWORD_MIN_RULES_ENV_KEY],
  };
}

/**
 * Classifica um code point em um dos 4 critérios, sem regex. Retorna 0 quando o
 * caractere não pontua (espaço em branco, caracteres de controle ou não-ASCII).
 */
function classifyCharacter(code: number): number {
  if (code >= 97 && code <= 122) return PasswordComplexityFlag.LOWERCASE; // a-z
  if (code >= 65 && code <= 90) return PasswordComplexityFlag.UPPERCASE; // A-Z
  if (code >= 48 && code <= 57) return PasswordComplexityFlag.DIGIT; // 0-9
  // Pontuação ASCII imprimível (! " # ... ~), excluindo letras/dígitos/espaço.
  if (
    (code >= 33 && code <= 47) ||
    (code >= 58 && code <= 64) ||
    (code >= 91 && code <= 96) ||
    (code >= 123 && code <= 126)
  ) {
    return PasswordComplexityFlag.SPECIAL;
  }
  return 0;
}

/**
 * Conta quantos critérios de complexidade DISTINTOS a senha atende em uma única
 * passada, interrompendo o laço assim que `targetRules` é alcançado.
 *
 * @param value String a ser avaliada.
 * @param targetRules Alvo de short-circuit (1..4). Default: todos os 4.
 */
export function countPasswordComplexityRules(
  value: string,
  targetRules: number = PASSWORD_COMPLEXITY_RULE_COUNT,
): number {
  const stopAt = clamp(targetRules, 1, PASSWORD_COMPLEXITY_RULE_COUNT);

  let satisfiedFlags = 0;
  let satisfiedCount = 0;

  for (let index = 0; index < value.length; index++) {
    const flag = classifyCharacter(value.charCodeAt(index));
    if (flag !== 0 && (satisfiedFlags & flag) === 0) {
      satisfiedFlags |= flag;
      satisfiedCount++;
      // Short-circuit: critérios exigidos satisfeitos antes do fim da string.
      if (satisfiedCount >= stopAt) break;
    }
  }

  return satisfiedCount;
}

/**
 * Normaliza a política: prioriza opções explícitas, depois o ambiente
 * (`ConfigService`/env) e, por fim, os fallbacks estáticos seguros.
 */
export function resolvePasswordValidatorOptions(
  options?: PasswordValidatorOptions,
  environment: PasswordPolicyEnvironment = readPasswordPolicyEnvironment(),
): ResolvedPasswordValidatorOptions {
  const minLength = firstValidInteger(
    [options?.minLength, environment.minLength],
    DEFAULT_PASSWORD_MIN_LENGTH,
    MIN_ALLOWED_LENGTH,
    Number.MAX_SAFE_INTEGER,
  );
  const minRules = firstValidInteger(
    [options?.minRules, environment.minRules],
    DEFAULT_PASSWORD_MIN_RULES,
    1,
    PASSWORD_COMPLEXITY_RULE_COUNT,
  );

  return { minLength, minRules };
}

/**
 * Valida uma senha contra a política flexível:
 * tamanho mínimo + pelo menos N de 4 critérios de complexidade.
 */
export function isPasswordCompliant(
  value: unknown,
  options?: PasswordValidatorOptions,
  environment?: PasswordPolicyEnvironment,
): boolean {
  if (typeof value !== 'string') return false;

  const { minLength, minRules } = resolvePasswordValidatorOptions(
    options,
    environment,
  );

  // Gate de tamanho primeiro: O(1) e evita varredura de senhas curtas.
  if (value.length < minLength) return false;
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_UTF8_BYTES) return false;

  return countPasswordComplexityRules(value, minRules) >= minRules;
}

/** Monta a mensagem explicativa da política (usada em `defaultMessage`). */
export function buildPasswordPolicyMessage(
  options?: ResolvedPasswordValidatorOptions,
): string {
  const { minLength, minRules } = options ?? resolvePasswordValidatorOptions();
  return (
    'A senha não atende aos critérios mínimos de complexidade e tamanho exigidos ' +
    `(mínimo de ${minLength} caracteres, máximo de ${PASSWORD_MAX_UTF8_BYTES} bytes UTF-8 e pelo menos ${minRules} de ` +
    `${PASSWORD_COMPLEXITY_RULE_COUNT} critérios: ` +
    `${PASSWORD_COMPLEXITY_CRITERIA_DESCRIPTION}).`
  );
}

/** Converte um candidato (número ou string numérica) em inteiro, se possível. */
function toInteger(candidate: unknown): number | undefined {
  if (typeof candidate === 'number') {
    return Number.isInteger(candidate) ? candidate : undefined;
  }
  if (typeof candidate === 'string' && candidate.trim() !== '') {
    const parsed = Number(candidate);
    return Number.isInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Retorna o primeiro candidato válido dentro de [min, max] ou o fallback. */
function firstValidInteger(
  candidates: readonly unknown[],
  fallback: number,
  min: number,
  max: number,
): number {
  for (const candidate of candidates) {
    const parsed = toInteger(candidate);
    if (parsed !== undefined && parsed >= min && parsed <= max) return parsed;
  }
  return fallback;
}

/** Restringe um número ao intervalo [min, max], ignorando valores não finitos. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}
