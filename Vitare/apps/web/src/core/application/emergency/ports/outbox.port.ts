import type { EmergencyTriggerPayload } from "../../../infrastructure/api/emergency.api";

export type EmergencyOutboxState =
  | "QUEUED"
  | "SYNCING"
  | "SYNCED"
  | "RETRY_WAIT"
  | "FAILED_PERMANENT";

export interface EmergencyOutboxOperation {
  id: string;
  ownerId: string;
  idempotencyKey: string;
  payload: EmergencyTriggerPayload;
  state: EmergencyOutboxState;
  attempts: number;
  createdAt: number;
  lastAttemptAt: number | null;
  nextAttemptAt: number;
  lastError: string | null;
  serverEventId?: string | null;
}

export interface OutboxPort {
  enqueueEmergencyOperation(
    ownerId: string,
    payload: EmergencyTriggerPayload
  ): Promise<EmergencyOutboxOperation>;

  hasPendingOperations(ownerId: string): Promise<boolean>;

  syncEmergencyOutbox(ownerId: string): Promise<void>;
}