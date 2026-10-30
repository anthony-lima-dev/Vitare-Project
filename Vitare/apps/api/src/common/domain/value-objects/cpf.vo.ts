import { DomainValidationError } from '../../errors/domain-error';

/**
 * Value Object CPF — identidade por valor, imutável, auto-validado.
 *
 * Regra de domínio: a representação canônica persistida é sempre a cadeia
 * de 11 dígitos (sem pontuação). A normalização sintática NÃO prova posse
 * do documento; apenas padroniza a representação para igualdade/unicidade.
 */
export class Cpf {
  private constructor(public readonly value: string) {}

  /**
   * Normaliza sem validar — tolera entrada ausente ou não-string na fronteira
   * HTTP/DTO, extraindo apenas os dígitos presentes.
   */
  static normalize(raw: unknown): string {
    if (typeof raw === 'string') return raw.replace(/\D/g, '');
    if (typeof raw === 'number') return String(raw).replace(/\D/g, '');
    return '';
  }

  /**
   * Invariante de formato: exatamente 11 dígitos e não uma sequência de
   * dígitos repetidos (ex.: `000.000.000-00`), que nunca é um CPF real.
   * Fonte única da regra usada por `create` e `isValidFormat`.
   */
  private static hasCanonicalFormat(normalized: string): boolean {
    return /^\d{11}$/.test(normalized) && !/^(\d)\1{10}$/.test(normalized);
  }

  /** Cria o VO exigindo o formato canônico (11 dígitos). */
  static create(raw: unknown): Cpf {
    const normalized = Cpf.normalize(raw);
    if (!Cpf.hasCanonicalFormat(normalized)) {
      throw new DomainValidationError('CPF em formato inválido', 'CPF_INVALID');
    }
    return new Cpf(normalized);
  }

  static isValidFormat(raw: unknown): boolean {
    return Cpf.hasCanonicalFormat(Cpf.normalize(raw));
  }

  equals(other: Cpf): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  /** Exibição mascarada: `123.***.***-09` (privacidade por desenho). */
  masked(): string {
    return this.value.replace(/^(\d{3})\d{6}(\d{2})$/, '$1.***.***-$2');
  }
}
