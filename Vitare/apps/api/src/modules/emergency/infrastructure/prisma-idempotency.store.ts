import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  ExecuteIdempotentInput,
  IdempotencyHandle,
  IdempotencyStorePort,
} from '../application/ports/idempotency-port';
import {
  IdempotencyInProgressError,
  IdempotencyPayloadMismatchError,
} from '../../../common/errors/domain-error';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Idempotência persistente em PostgreSQL. A chave (usuário + escopo + key) é
 * única; reserva, execução do negócio e gravação do resultado acontecem na
 * MESMA transação — sem janela em que o evento existe sem o resultado salvo.
 * Redis não é usado como garantia, apenas como acelerador opcional.
 */
@Injectable()
export class PrismaIdempotencyStore implements IdempotencyStorePort {
  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(
    input: ExecuteIdempotentInput,
    operation: (tx: unknown) => Promise<T>,
  ): Promise<IdempotencyHandle<T>> {
    const where = {
      userId_scope_key: {
        userId: input.userId,
        scope: input.scope,
        key: input.key,
      },
    } as const;
    const expiresAt = new Date(Date.now() + input.ttlHours * 3_600_000);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.idempotencyRecord.create({
          data: {
            userId: input.userId,
            scope: input.scope,
            key: input.key,
            requestHash: input.requestHash,
            status: 'IN_PROGRESS',
            expiresAt,
          },
        });

        const result = await operation(tx);

        // JSONB exige tipos serializáveis — as datas viram ISO strings.
        const responsePayload = JSON.parse(
          JSON.stringify(result ?? null),
        ) as Record<string, unknown>;

        await tx.idempotencyRecord.update({
          where,
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            responsePayload: responsePayload as Prisma.InputJsonValue,
          },
        });

        return { result, replay: false };
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      return this.resolveDuplicate<T>(where, input.requestHash);
    }
  }

  private async resolveDuplicate<T>(
    where: {
      userId_scope_key: { userId: string; scope: string; key: string };
    },
    requestHash: string,
    attempt = 0,
  ): Promise<IdempotencyHandle<T>> {
    const existing = await this.prisma.idempotencyRecord.findUnique({ where });
    if (!existing) throw new IdempotencyInProgressError();

    if (existing.expiresAt < new Date()) {
      // Registro expirado: remove (deleteMany por filtro é idempotente — duas
      // retries concorrentes da mesma chave expirada não competem pelo delete)
      // e devolve conflito RETENTÁVEL. O próximo envio reserva a chave de novo
      // sob a constraint única — sem ciclo extra obrigatório e sem duplicar
      // o incidente (reserva e negócio seguem na mesma transação).
      await this.prisma.idempotencyRecord.deleteMany({
        where: {
          userId: existing.userId,
          scope: existing.scope,
          key: existing.key,
        },
      });
      throw new IdempotencyInProgressError(
        'Chave de idempotência expirada; repita a mesma operação para reprocessar.',
      );
    }

    if (existing.requestHash !== requestHash) {
      throw new IdempotencyPayloadMismatchError();
    }

    if (existing.status === 'COMPLETED' && existing.responsePayload) {
      return {
        result: existing.responsePayload as unknown as T,
        replay: true,
      };
    }

    // Operação concorrente ainda em andamento: aguarda a finalização uma
    // vez antes de devolver 409 (evita erro espúrio em retries imediatos).
    if (attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return this.resolveDuplicate<T>(where, requestHash, attempt + 1);
    }
    throw new IdempotencyInProgressError();
  }
}
