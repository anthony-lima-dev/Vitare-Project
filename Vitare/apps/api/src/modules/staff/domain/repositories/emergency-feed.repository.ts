import { StaffEmergencyFeedItem } from '../entities/staff-emergency-feed-item.entity';

export type { StaffEmergencyFeedItem };

export abstract class EmergencyFeedRepository {
  /** Feed operacional recente — SEM snapshot clínico (projeção mínima). */
  abstract findRecent(limit: number): Promise<StaffEmergencyFeedItem[]>;
}
