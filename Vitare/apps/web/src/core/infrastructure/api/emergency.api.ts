import { apiClient } from "./client";

export interface EmergencyTriggerPayload {
  latitude?: number;
  longitude?: number;
  /** Snapshot capturado offline — marcado pelo servidor como origem "client". */
  patientSnapshot?: Record<string, unknown>;
  /** Horário do acionamento registrado pelo dispositivo (offline). */
  clientTriggeredAt?: string;
}

/**
 * Contrato de erro do backend (DomainErrorFilter):
 * `{ statusCode, message, error: código-estável }`.
 *
 * Códigos relevantes do fluxo de acionamento:
 * - `IdempotencyInProgressError`  → 409 RETENTÁVEL (operação idêntica em
 *   processamento ou chave expirada em reprocessamento);
 * - `IdempotencyPayloadMismatchError` → 409 PERMANENTE (mesma chave com
 *   conteúdo divergente — nunca se corrige com retry);
 * - `IDEMPOTENCY_KEY_REQUIRED`/`IDEMPOTENCY_KEY_INVALID` → 400 PERMANENTE.
 */
export interface EmergencyApiErrorShape {
  statusCode?: number;
  message?: string;
  error?: string;
}

export function extractApiError(error: unknown): {
  status?: number;
  code?: string;
  message?: string;
} {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: EmergencyApiErrorShape }).response;
    if (response && typeof response === "object") {
      return {
        status: response.statusCode,
        code: response.error,
        message: response.message,
      };
    }
  }
  return {};
}

export const emergencyApi = {
  /**
   * Aciona a emergência usando a chave de idempotência estável da operação
   * local: retrys automáticos NUNCA geram um incidente duplicado e a chave é
   * OBRIGATÓRIA no contrato (o backend rejeita o envio sem ela).
   */
  trigger: (data: EmergencyTriggerPayload, idempotencyKey: string) =>
    apiClient.post("/emergency/trigger", data, {
      headers: { "x-idempotency-key": idempotencyKey },
    }),
};
