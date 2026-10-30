/**
 * Fachada de compatibilidade sobre o Value Object `Cpf`
 * (shared kernel). Novos consumidores devem usar `Cpf` diretamente.
 */
import { Cpf } from '../domain/value-objects/cpf.vo';

export function normalizeCpf(value: string): string {
  return Cpf.normalize(value);
}

export function isValidCpfFormat(value: string): boolean {
  return Cpf.isValidFormat(value);
}
