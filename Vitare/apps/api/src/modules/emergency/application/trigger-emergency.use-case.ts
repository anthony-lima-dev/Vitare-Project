import { Inject, Injectable } from '@nestjs/common';
import {
  EMERGENCY_REPOSITORY,
  type EmergencyEventRecord,
  type EmergencyRepositoryPort,
} from './ports/emergency-ports';
import {
  IDEMPOTENCY_STORE,
  type IdempotencyStorePort,
} from './ports/idempotency-port';
import {
  buildClientOriginSnapshot,
  buildServerSnapshot,
  type PatientSnapshot,
} from '../domain/clinical-snapshot';
import { isValidLatitude, isValidLongitude } from '../domain/geo';
import { fingerprintPayload } from '../../../common/utils/hash.util';
import {
  DomainValidationError,
  InvalidIdempotencyKeyError,
  MissingIdempotencyKeyError,
} from '../../../common/errors/domain-error';

/** Chaves de idempotência: UUID (36 caracteres, hexa + traços). */
const IDEMPOTENCY_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Entrada de aplicação — independente dos DTOs de apresentação. */
export interface TriggerEmergencyInput {
  latitude?: number;
  longitude?: number;
  patientSnapshot?: Record<string, unknown>;
  clientTriggeredAt?: string;
}

export interface TriggerEmergencyCommand {
  userId: string;
  input: TriggerEmergencyInput;
  /** OBRIGATÓRIA: retries offline reutilizam a mesma chave lógica. */
  idempotencyKey: string;
  idempotencyTtlHours: number;
}

export interface TriggerEmergencyResult {
  event: EmergencyEventRecord;
  replay: boolean;
}

@Injectable()
export class TriggerEmergencyUseCase {
  constructor(
    @Inject(EMERGENCY_REPOSITORY)
    private readonly emergencyRepository: EmergencyRepositoryPort,
    @Inject(IDEMPOTENCY_STORE)
    private readonly idempotencyStore: IdempotencyStorePort,
  ) {}

  async execute(
    command: TriggerEmergencyCommand,
  ): Promise<TriggerEmergencyResult> {
    this.assertValidIdempotencyKey(command.idempotencyKey);

    const { input } = command;
    const hasLatitude = input.latitude !== undefined && input.latitude !== null;
    const hasLongitude =
      input.longitude !== undefined && input.longitude !== null;
    if (hasLatitude !== hasLongitude) {
      throw new DomainValidationError(
        'Latitude e longitude devem ser enviadas juntas ou ambas omitidas.',
      );
    }
    if (hasLatitude && !isValidLatitude(input.latitude!)) {
      throw new DomainValidationError('Latitude fora do intervalo [-90, 90].');
    }
    if (hasLongitude && !isValidLongitude(input.longitude!)) {
      throw new DomainValidationError(
        'Longitude fora do intervalo [-180, 180].',
      );
    }

    // Impressão completa do payload: retries com conteúdo divergente sob a
    // mesma chave são rejeitados pelo store (IdempotencyPayloadMismatchError).
    const requestHash = fingerprintPayload({
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      patientSnapshot: input.patientSnapshot ?? null,
      clientTriggeredAt: input.clientTriggeredAt ?? null,
    });

    const run = async (tx: unknown): Promise<EmergencyEventRecord> => {
      const receivedAt = new Date();
      let snapshot: PatientSnapshot;

      if (
        input.patientSnapshot &&
        Object.keys(input.patientSnapshot).length > 0
      ) {
        // Acionamento offline: snapshot sanitizado por allowlist e marcado
        // como de origem do cliente (nunca apresentado como validado).
        snapshot = buildClientOriginSnapshot(input.patientSnapshot, receivedAt);
      } else {
        const source = await this.emergencyRepository.buildSnapshotSource(
          command.userId,
          tx,
        );
        snapshot = buildServerSnapshot(
          source,
          input.clientTriggeredAt,
          receivedAt,
        );
      }

      return this.emergencyRepository.createEvent(
        {
          userId: command.userId,
          latitude: input.latitude,
          longitude: input.longitude,
          patientSnapshot: snapshot,
        },
        tx,
      );
    };

    const handle = await this.idempotencyStore.execute<EmergencyEventRecord>(
      {
        userId: command.userId,
        scope: 'emergency.trigger',
        key: command.idempotencyKey,
        requestHash,
        ttlHours: command.idempotencyTtlHours,
      },
      run,
    );

    return { event: handle.result, replay: handle.replay };
  }

  /** Contrato obrigatório: ausente/branca → 400 IDEMPOTENCY_KEY_REQUIRED. */
  private assertValidIdempotencyKey(key: string): void {
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new MissingIdempotencyKeyError();
    }
    if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
      throw new InvalidIdempotencyKeyError();
    }
  }
}
