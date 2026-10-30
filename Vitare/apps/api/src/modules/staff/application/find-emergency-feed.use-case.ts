import { Injectable } from '@nestjs/common';
import {
  EmergencyFeedRepository,
  StaffEmergencyFeedItem,
} from '../domain/repositories/emergency-feed.repository';

export const EMERGENCY_FEED_MAX_LIMIT = 100;
export const EMERGENCY_FEED_DEFAULT_LIMIT = 50;

/**
 * Feed operacional da equipe: projeta apenas dados operacionais e a
 * identificação mínima do paciente (nome/CPF). Nenhum dado clínico é
 * exposto em listagens — o prontuário completo exige lookup auditado.
 */
@Injectable()
export class FindEmergencyFeedUseCase {
  constructor(private readonly repository: EmergencyFeedRepository) {}

  execute(limit: number): Promise<StaffEmergencyFeedItem[]> {
    const parsed = Number.isFinite(limit) ? Math.trunc(limit) : NaN;
    const safeLimit =
      Number.isNaN(parsed) || parsed < 1
        ? EMERGENCY_FEED_DEFAULT_LIMIT
        : Math.min(parsed, EMERGENCY_FEED_MAX_LIMIT);
    return this.repository.findRecent(safeLimit);
  }
}
