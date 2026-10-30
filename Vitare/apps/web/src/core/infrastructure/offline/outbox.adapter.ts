import type { OutboxPort } from "../../application/emergency/ports/outbox.port";
import type { EmergencyTriggerPayload } from "../api/emergency.api";
import {
  enqueueEmergencyOperation,
  hasPendingOperations,
  syncEmergencyOutbox,
  type EmergencyOutboxOperation,
} from "./emergency-outbox";

/**
 * Adapter que implementa OutboxPort usando a implementação existente.
 */
export class EmergencyOutboxAdapter implements OutboxPort {
  async enqueueEmergencyOperation(
    ownerId: string,
    payload: EmergencyTriggerPayload
  ): Promise<EmergencyOutboxOperation> {
    return enqueueEmergencyOperation(ownerId, payload);
  }

  async hasPendingOperations(ownerId: string): Promise<boolean> {
    return hasPendingOperations(ownerId);
  }

  async syncEmergencyOutbox(ownerId: string): Promise<void> {
    return syncEmergencyOutbox(ownerId);
  }
}

export const outboxAdapter = new EmergencyOutboxAdapter();