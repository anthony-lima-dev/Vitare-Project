/** Porta de idempotência persistente — aplicação não conhece Prisma nem Redis. */

export interface IdempotencyHandle<T> {
  result: T;
  /** true quando a resposta veio de registro idempotente já completado. */
  replay: boolean;
}

export interface ExecuteIdempotentInput {
  userId: string;
  scope: string;
  key: string;
  requestHash: string;
  ttlHours: number;
}

export interface IdempotencyStorePort {
  /**
   * Reserva a chave atomicamente e executa `operation` UMA ÚNICA VEZ,
   * persistindo resultado e negócio na mesma transação.
   * - Repetição com o mesmo payload → resultado anterior (replay).
   * - Mesma chave com payload divergente → IdempotencyPayloadMismatchError.
   * - Operação em andamento → IdempotencyInProgressError.
   */
  execute<T>(
    input: ExecuteIdempotentInput,
    operation: (tx: unknown) => Promise<T>,
  ): Promise<IdempotencyHandle<T>>;
}

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');
