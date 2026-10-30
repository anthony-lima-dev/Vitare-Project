import { Injectable } from '@nestjs/common';
import {
  EmergencyFeedRepository,
  StaffEmergencyFeedItem,
} from '../domain/repositories/emergency-feed.repository';

export const MAX_EMERGENCY_FEED_LIMIT = 100;
export const DEFAULT_EMERGENCY_FEED_LIMIT = 50;

/**
 * Feed operacional: projeta APENAS dados operacionais + identidade mínima
 * do paciente (nome/CPF). O snapshot clínico NUNCA trafega em listas —
 * é recuperável somente pelo endpoint protegido de consulta por CPF.
 */
@Injectable()
export class GetEmergencyFeedUseCase {
  constructor(private readonly repository: EmergencyFeedRepository) {}

  async execute(rawLimit?: number): Promise<StaffEmergencyFeedItem[]> {
    const limit =
      typeof rawLimit === 'number' && Number.isFinite(rawLimit)
        ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_EMERGENCY_FEED_LIMIT)
        : DEFAULT_EMERGENCY_FEED_LIMIT;

    return this.repository.findRecent(limit);
  }
}
