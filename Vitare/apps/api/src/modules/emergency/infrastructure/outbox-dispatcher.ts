import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { RedisService } from '../../../infra/redis/redis.service';
import {
  EMERGENCY_REPOSITORY,
  type EmergencyRepositoryPort,
} from '../application/ports/emergency-ports';
import { EmergencyGateway } from '../presentation/emergency.gateway';
import { randomUUID } from 'crypto';

const POLL_INTERVAL_MS = 2_500;
const BATCH_LIMIT = 20;
const MAX_ATTEMPTS = 10;
const LEASE_TTL_MS = 10_000;

/**
 * Dispatcher do Outbox do servidor: publica eventos operacionais pendentes
 * no WebSocket com deduplicação por id (o cliente descarta repetições) e
 * recuperação após falhas (o evento permanece PENDING até confirmar o envio).
 * Em múltiplas instâncias, um lock curto em Redis evita publicações
 * duplicadas sem exigir infraestrutura adicional persistente.
 */
@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: EmergencyGateway,
    private readonly redis: RedisService,
    @Inject(EMERGENCY_REPOSITORY)
    private readonly emergencyRepository: EmergencyRepositoryPort,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.flushOnce();
    }, POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async flushOnce(): Promise<void> {
    // Claim/lease via DB to avoid duplicate processing even if Redis unavailable.
    // We atomically move a batch from PENDING -> PROCESSING with a lease timestamp.
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + LEASE_TTL_MS);

    // Use a transaction to claim and fetch the batch.
    const claimed = await this.prisma.$transaction(async (tx) => {
      // Find ids of pending events to claim.
      const pending = await tx.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: BATCH_LIMIT,
        select: { id: true },
      });
      if (pending.length === 0) return [];

      const ids = pending.map((e) => e.id);
      // Update claimed rows to PROCESSING with lease.
      await tx.outboxEvent.updateMany({
        where: { id: { in: ids }, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          lastError: null,
          attempts: { increment: 1 },
          publishedAt: leaseUntil,
        },
      });

      // Return full rows for processing.
      return tx.outboxEvent.findMany({
        where: { id: { in: ids } },
      });
    });

    for (const event of claimed) {
      await this.dispatch(event);
    }
  }

  private async dispatch(event: {
    id: string;
    type: string;
    payload: unknown;
  }): Promise<void> {
    // Acquire short-lived lock to avoid duplicate publish in clustered deployment
    const lockKey = `outbox:lock:${event.id}`;
    const lockOwner = randomUUID();
    const gotLock = await this.redis.acquireLock(lockKey, lockOwner, 5_000);
    if (!gotLock) {
      // Another instance will publish this event
      return;
    }

    try {
      const payload =
        event.payload && typeof event.payload === 'object'
          ? (event.payload as Record<string, unknown>)
          : {};

      // Add eventId for client-side deduplication
      this.gateway.publishOperationalEvent(event.type, {
        ...payload,
        eventId: event.id,
      });

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PUBLISHED', publishedAt: new Date(), lastError: null },
      });

      if (
        event.type === 'emergency.triggered' &&
        typeof payload.id === 'string'
      ) {
        await this.emergencyRepository.markNotifiedIfCurrent(payload.id);
      }
    } catch (error) {
      const message = (error as Error).message;
      // On failure, move back to PENDING so another lease can pick it up,
      // unless max attempts reached.
      const updated = await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          lastError: message,
          status: 'PENDING',
          publishedAt: null,
        },
      });

      if (updated.attempts >= MAX_ATTEMPTS) {
        await this.prisma.outboxEvent
          .update({ where: { id: event.id }, data: { status: 'FAILED' } })
          .catch((finalizeError) =>
            this.logger.warn(
              `Falha ao finalizar evento Outbox ${event.id}: ${(finalizeError as Error).message}`,
            ),
          );
      }
      this.logger.warn(`Falha ao publicar evento ${event.id}: ${message}`);
    } finally {
      await this.redis.releaseLock(lockKey, lockOwner);
    }
  }
}
