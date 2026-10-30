import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMERGENCY_REPOSITORY,
  type EmergencyRepositoryPort,
} from './ports/emergency-ports';
import {
  TriggerEmergencyInput,
  TriggerEmergencyResult,
  TriggerEmergencyUseCase,
} from './trigger-emergency.use-case';

/**
 * Fachada de aplicação do módulo de emergência: preserva a superfície usada
 * pelos controladores enquanto a lógica vive nos use cases. Recebe SOMENTE
 * tipos de aplicação (`TriggerEmergencyInput`) — nunca DTO de apresentação.
 */
@Injectable()
export class EmergencyService {
  constructor(
    @Inject(EMERGENCY_REPOSITORY)
    private readonly emergencyRepository: EmergencyRepositoryPort,
    private readonly triggerUseCase: TriggerEmergencyUseCase,
    private readonly config: ConfigService,
  ) {}

  /** ... trigger method unchanged ... */

  trigger(
    userId: string,
    input: TriggerEmergencyInput,
    idempotencyKey: string,
  ): Promise<TriggerEmergencyResult> {
    return this.triggerUseCase.execute({
      userId,
      input,
      idempotencyKey,
      idempotencyTtlHours: Number(
        this.config.get<string>('EMERGENCY_IDEMPOTENCY_TTL_HOURS') ?? '24',
      ),
    });
  }

  findAllByUser(userId: string) {
    return this.emergencyRepository.findAllByUser(userId);
  }

  findManyByUser(
    userId: string,
    options?: {
      cursor?: string;
      take?: number;
      orderBy?: { createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' };
    },
  ) {
    return this.emergencyRepository.findManyByUser(userId, options);
  }
}
