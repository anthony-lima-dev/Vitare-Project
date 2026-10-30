/**
 * Primitivas do domínio (shared kernel).
 *
 * A camada de domínio não pode depender de Prisma, NestJS nem de qualquer
 * framework. Colunas `Decimal`/`Json` do banco são representadas aqui por
 * tipos estruturais mínimos para que os adaptadores de persistência possam
 * devolver as linhas do Prisma sem reemissão de cópias (structural typing).
 */
export interface NumericValue {
  toString(): string;
  toNumber(): number;
}

/** Campo JSON opaco cuja estrutura pertence a outro contexto (snapshot). */
export type JsonDocument = unknown;
