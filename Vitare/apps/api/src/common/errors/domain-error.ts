/**
 * Erros de domínio tipados. A camada de apresentação converte esses erros em
 * respostas HTTP previsíveis via `DomainErrorFilter`, sem expor detalhes
 * internos. Nenhuma dessas classes pode importar NestJS, Prisma ou Redis.
 */
export abstract class DomainError extends Error {
  abstract readonly statusCode: number;
  readonly code: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = new.target.name;
    this.code = code ?? new.target.name;
  }
}

/** 404 — recurso inexistente dentro do escopo autorizado. */
export class ResourceNotFoundError extends DomainError {
  readonly statusCode = 404;
}

/** 403 — acesso negado por regra de negócio/autorização. */
export class OperationForbiddenError extends DomainError {
  readonly statusCode = 403;
}

/** 409 — estado atual do recurso incompatível com a operação. */
export class StateConflictError extends DomainError {
  readonly statusCode = 409;
}

/** 409 — transição do ciclo de vida não permitida pela máquina de estados. */
export class InvalidEmergencyTransitionError extends StateConflictError {
  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super(`Transição de emergência inválida: ${from} → ${to}`);
  }
}

/** 409 — incidente já aceito/atribuído por outro profissional. */
export class AssignmentConflictError extends StateConflictError {
  constructor(message = 'O incidente já foi assumido por outro profissional') {
    super(message);
  }
}

/** 409 — mesma chave de idempotência reutilizada com payload divergente. */
export class IdempotencyPayloadMismatchError extends StateConflictError {
  constructor(
    message = 'A chave de idempotência já foi utilizada com outro conteúdo',
  ) {
    super(message);
  }
}

/** 409 — operação idempotente ainda em processamento por outra requisição. */
export class IdempotencyInProgressError extends StateConflictError {
  constructor(message = 'Operação idêntica ainda em processamento') {
    super(message);
  }
}

/** 400 — contrato exige chave de idempotência e ela não foi enviada. */
export class MissingIdempotencyKeyError extends DomainError {
  readonly statusCode = 400;

  constructor(message = 'Chave de idempotência obrigatória não informada') {
    super(message, 'IDEMPOTENCY_KEY_REQUIRED');
  }
}

/** 400 — chave de idempotência fora do formato/limite permitido. */
export class InvalidIdempotencyKeyError extends DomainError {
  readonly statusCode = 400;

  constructor(message = 'Chave de idempotência inválida') {
    super(message, 'IDEMPOTENCY_KEY_INVALID');
  }
}

/** 409 — persistência simultânea detectada (ex.: chave única); retentável. */
export class ConcurrencyConflictError extends StateConflictError {}

/** 422 — violação de regra clínica de bloqueio. */
export class ClinicalRestrictionViolationError extends DomainError {
  readonly statusCode = 422;
}

/** 503 — dependência técnica temporariamente indisponível. */
export class DependencyUnavailableError extends DomainError {
  readonly statusCode = 503;
}

/** 422 — violação de invariante de formato/valor na fronteira do domínio. */
export class DomainValidationError extends DomainError {
  readonly statusCode = 422;
}
