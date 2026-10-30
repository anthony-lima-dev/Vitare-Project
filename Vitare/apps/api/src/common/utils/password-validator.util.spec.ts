import {
  DEFAULT_PASSWORD_MIN_LENGTH,
  DEFAULT_PASSWORD_MIN_RULES,
  PASSWORD_COMPLEXITY_RULE_COUNT,
  PASSWORD_MIN_LENGTH_ENV_KEY,
  PASSWORD_MIN_RULES_ENV_KEY,
  buildPasswordPolicyMessage,
  countPasswordComplexityRules,
  isPasswordCompliant,
  readPasswordPolicyEnvironment,
  resolvePasswordValidatorOptions,
} from './password-validator.util';

describe('password-validator.util', () => {
  describe('resolvePasswordValidatorOptions', () => {
    it('usa os fallbacks estáticos quando não há opções nem ambiente', () => {
      expect(resolvePasswordValidatorOptions(undefined, {})).toEqual({
        minLength: DEFAULT_PASSWORD_MIN_LENGTH,
        minRules: DEFAULT_PASSWORD_MIN_RULES,
      });
    });

    it('prioriza opções explícitas sobre o ambiente', () => {
      expect(
        resolvePasswordValidatorOptions(
          { minLength: 12, minRules: 3 },
          { minLength: '20', minRules: '4' },
        ),
      ).toEqual({ minLength: 12, minRules: 3 });
    });

    it('aceita números em string vindos de env/ConfigService', () => {
      expect(
        resolvePasswordValidatorOptions(undefined, {
          minLength: '10',
          minRules: '3',
        }),
      ).toEqual({ minLength: 10, minRules: 3 });
    });

    it('ignora valores inválidos e aplica o fallback (minRules > 4)', () => {
      expect(
        resolvePasswordValidatorOptions(undefined, {
          minLength: 'abc',
          minRules: '9',
        }),
      ).toEqual({
        minLength: DEFAULT_PASSWORD_MIN_LENGTH,
        minRules: DEFAULT_PASSWORD_MIN_RULES,
      });
    });
  });

  describe('readPasswordPolicyEnvironment', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('lê as chaves mapeadas em configuration.ts', () => {
      process.env[PASSWORD_MIN_LENGTH_ENV_KEY] = '9';
      process.env[PASSWORD_MIN_RULES_ENV_KEY] = '3';

      expect(readPasswordPolicyEnvironment()).toEqual({
        minLength: '9',
        minRules: '3',
      });
    });
  });

  describe('countPasswordComplexityRules', () => {
    it('conta os 4 critérios distintos', () => {
      expect(countPasswordComplexityRules('aB3!')).toBe(
        PASSWORD_COMPLEXITY_RULE_COUNT,
      );
    });

    it('não conta critérios repetidos (bitmask idempotente)', () => {
      expect(countPasswordComplexityRules('aaaa')).toBe(1);
      expect(countPasswordComplexityRules('1111')).toBe(1);
    });

    it('faz short-circuit no alvo informado', () => {
      expect(countPasswordComplexityRules('aB3!', 1)).toBe(1);
      expect(countPasswordComplexityRules('aB3!', 2)).toBe(2);
      expect(countPasswordComplexityRules('aB3!', 4)).toBe(4);
    });

    it('ignora espaços e caracteres sem classe de complexidade', () => {
      expect(countPasswordComplexityRules('        ')).toBe(0);
      expect(countPasswordComplexityRules('a b')).toBe(1);
    });
  });

  describe('isPasswordCompliant', () => {
    it('aprova apenas números e letras minúsculas (>= 8)', () => {
      expect(isPasswordCompliant('abcd1234', undefined, {})).toBe(true);
    });

    it('aprova apenas números e caracteres especiais (>= 8)', () => {
      expect(isPasswordCompliant('12345678!', undefined, {})).toBe(true);
    });

    it('aprova senha com 3 critérios', () => {
      expect(isPasswordCompliant('Passw0rd', undefined, {})).toBe(true);
    });

    it('reprova senha que excede 72 bytes UTF-8, mesmo se tiver até 72 caracteres', () => {
      expect(isPasswordCompliant('á'.repeat(40) + 'A1!', undefined, {})).toBe(
        false,
      );
      expect(isPasswordCompliant('Abcdef12!', undefined, {})).toBe(true);
    });

    it('reprova senha curta mesmo com alta complexidade', () => {
      expect(isPasswordCompliant('Ab1!', undefined, {})).toBe(false);
    });

    it('reprova senha longa com apenas 1 critério', () => {
      expect(isPasswordCompliant('123456789012', undefined, {})).toBe(false);
      expect(isPasswordCompliant('abcdefghijkl', undefined, {})).toBe(false);
      expect(isPasswordCompliant('!!!!!!!!!!!!', undefined, {})).toBe(false);
    });

    it('reprova valores vazios e tipos que não sejam string', () => {
      expect(isPasswordCompliant('', undefined, {})).toBe(false);
      expect(isPasswordCompliant(undefined, undefined, {})).toBe(false);
      expect(isPasswordCompliant(null, undefined, {})).toBe(false);
      expect(isPasswordCompliant(12345678, undefined, {})).toBe(false);
      expect(isPasswordCompliant({}, undefined, {})).toBe(false);
    });

    it('respeita opções estritas explícitas', () => {
      const strict = { minLength: 12, minRules: 3 };
      expect(isPasswordCompliant('abcd1234', strict, {})).toBe(false);
      expect(isPasswordCompliant('abcd123456!!', strict, {})).toBe(true);
    });
  });

  describe('buildPasswordPolicyMessage', () => {
    it('descreve tamanho e critérios mínimos', () => {
      const message = buildPasswordPolicyMessage();

      expect(message).toContain('A senha não atende aos critérios mínimos');
      expect(message).toContain(`${DEFAULT_PASSWORD_MIN_LENGTH} caracteres`);
      expect(message).toContain(`${DEFAULT_PASSWORD_MIN_RULES} de 4`);
    });
  });
});
