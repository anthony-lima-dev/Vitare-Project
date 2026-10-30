/**
 * Caso de uso de acionamento de emergência (camada de aplicação).
 *
 * Orquestra os ports de geolocalização e outbox offline sem conhecer React,
 * navegador ou UI: a apresentação injeta `confirmContinueWithoutLocation`
 * (decisão do usuário) e recebe um resultado discriminado para mapear em
 * toasts. A regra de validade das coordenadas vive no domínio.
 */
import type { EmergencyTriggerPayload } from "../../../infrastructure/api/emergency.api";
import { toValidatedCoordinates } from "../../../domain/emergency/emergency-coordinates";
import type { GeolocationPort } from "../ports/geolocation.port";
import type { OutboxPort } from "../ports/outbox.port";

export type TriggerEmergencyOutcome =
  | { outcome: "triggered"; withLocation: boolean }
  | { outcome: "pending-offline" }
  | { outcome: "cancelled-by-user" }
  | { outcome: "failed"; reason: string };

export interface TriggerEmergencyPorts {
  /**
   * Pergunta ao usuário se deve prosseguir sem localização. Retornar
   * `false` cancela o acionamento (nenhuma operação é criada).
   */
  confirmContinueWithoutLocation: (message: string) => Promise<boolean> | boolean;
  /** Porta de geolocalização — injetável para testes. */
  geolocation?: GeolocationPort;
  /** Porta de outbox offline — injetável para testes. */
  outbox?: OutboxPort;
}

const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEOLOCATION_MAXIMUM_AGE_MS = 0;

function geolocationFailureMessage(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    return error.message;
  }
  return "Não foi possível obter a localização do dispositivo.";
}

export async function triggerEmergency(
  ownerId: string,
  ports: TriggerEmergencyPorts,
): Promise<TriggerEmergencyOutcome> {
  const geolocation = ports.geolocation;
  const outbox = ports.outbox;

  const payload: EmergencyTriggerPayload = {
    clientTriggeredAt: new Date().toISOString(),
  };

  // Try to get location
  if (geolocation) {
    try {
      const position = await geolocation.getCurrentPosition({
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAXIMUM_AGE_MS,
      });

      const coordinates = toValidatedCoordinates(position);
      if (coordinates) {
        payload.latitude = coordinates.latitude;
        payload.longitude = coordinates.longitude;
      } else {
        throw new Error("O navegador retornou coordenadas inválidas.");
      }
    } catch (error) {
      console.error("Falha ao obter localização para emergência:", error);
      const message = geolocationFailureMessage(error);
      const continueWithoutLocation = await ports.confirmContinueWithoutLocation(message);

      if (!continueWithoutLocation) {
        return { outcome: "cancelled-by-user" };
      }
    }
  }

  // Use outbox if available
  if (outbox) {
    try {
      await outbox.enqueueEmergencyOperation(ownerId, payload);
      await outbox.syncEmergencyOutbox(ownerId);

      const stillPending = await outbox.hasPendingOperations(ownerId);
      if (stillPending) {
        return { outcome: "pending-offline" };
      }

      return {
        outcome: "triggered",
        withLocation: payload.latitude !== undefined && payload.longitude !== undefined,
      };
    } catch (error) {
      return { outcome: "failed", reason: String(error) };
    }
  }

  // Fallback: if no outbox port, return failed
  return { outcome: "failed", reason: "Outbox port not available" };
}
