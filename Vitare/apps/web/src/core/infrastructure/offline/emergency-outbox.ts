/**
 * Outbox LOCAL de emergências (IndexedDB): persiste o acionamento ANTES do
 * envio, com chave de idempotência estável. O estado local jamais é
 * apresentado como confirmação do servidor — `SYNCED` somente após a API
 * confirmar a persistência do incidente (ou devolver um replay idempotente).
 *
 * Semântica de recuperação (defeito 5.14):
 * - `SYNCING` é um LEASE no IndexedDB compartilhado entre abas: operações
 *   nessa há mais de `SYNC_CLAIM_TIMEOUT_MS` são devolvidas a `RETRY_WAIT`
 *   com a MESMA chave (crash/fechamento de aba nunca strande uma operação);
 * - 409 `IdempotencyInProgressError` é RETENTÁVEL (operação idêntica em
 *   curso); 409 `IdempotencyPayloadMismatchError` é PERMANENTE (a mesma chave
 *   com payload divergente jamais se corrige com retry);
 * - a operação é sempre filtrada pelo `ownerId`: após logout/troca de conta
 *   ela nunca é reenviada com credenciais de outro usuário.
 */
import { withStore, getOutboxStoreName } from "../pwa/indexed-db";
import {
  emergencyApi,
  extractApiError,
  type EmergencyTriggerPayload,
} from "../api/emergency.api";

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
  /** ID do incidente confirmado pelo servidor — só existe em SYNCED. */
  serverEventId?: string | null;
}

const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;
/** Lease de reivindicação: SYNCING mais antigo que isso é considerado órfão. */
export const SYNC_CLAIM_TIMEOUT_MS = 30_000;

function now(): number {
  return Date.now();
}

function backoffDelay(attempts: number): number {
  // Exponencial com jitter determinístico simples por tentativa.
  const jitter = (attempts * 137) % 500;
  return Math.min(BASE_BACKOFF_MS * 2 ** attempts + jitter, 60_000);
}

/**
 * Classifica um erro de sincronização usando o código ESTÁVEL do backend
 * (`{ statusCode, message, error }`) — nunca apenas o status HTTP, pois 409
 * abriga tanto conflito permanente quanto em-progresso retentável.
 */
export function classifySyncError(error: unknown): {
  retryable: boolean;
  attempts: boolean;
  label: string;
} {
  const { status, code } = extractApiError(error);

  // Conflito permanente: mesma chave com fingerprint divergente, ou chave
  // ausente/inválida no contrato — retry não muda o resultado.
  if (
    code === "IdempotencyPayloadMismatchError" ||
    code === "IDEMPOTENCY_KEY_REQUIRED" ||
    code === "IDEMPOTENCY_KEY_INVALID"
  ) {
    return {
      retryable: false,
      attempts: false,
      label: code === "IdempotencyPayloadMismatchError"
        ? "Conflito de idempotência: mesma chave com conteúdo diferente."
        : "Chave de idempotência ausente ou inválida.",
    };
  }

  // Em-progresso / chave expirada em reprocessamento: RETENTÁVEL.
  if (code === "IdempotencyInProgressError") {
    return {
      retryable: true,
      attempts: true,
      label: "Operação idêntica em processamento no servidor.",
    };
  }

  // Validação de payload: permanente (o payload local não muda sozinho).
  if (status === 400 || status === 422) {
    return { retryable: false, attempts: false, label: `HTTP ${status}` };
  }

  // 401/403 podem se resolver após re-login/refresh do token: retentável.
  if (status !== undefined) {
    return { retryable: true, attempts: true, label: `HTTP ${status}` };
  }

  return {
    retryable: true,
    attempts: true,
    label: "Sem resposta do servidor (offline ou timeout).",
  };
}

/** Gera chave idempotente estável — criada UMA vez por operação lógica. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueueEmergencyOperation(
  ownerId: string,
  payload: EmergencyTriggerPayload,
): Promise<EmergencyOutboxOperation> {
  const operation: EmergencyOutboxOperation = {
    id: newIdempotencyKey(),
    ownerId,
    idempotencyKey: newIdempotencyKey(),
    payload,
    state: "QUEUED",
    attempts: 0,
    createdAt: now(),
    lastAttemptAt: null,
    nextAttemptAt: now(),
    lastError: null,
  };

  // Gravação atômica: a operação só passa a existir localmente com payload
  // e chave completos — um crash nunca deixa um placeholder vazio.
  await withStore(getOutboxStoreName(), "readwrite", (store) => {
    store.add(operation);
  });
  return operation;
}

export async function listPendingOperations(): Promise<EmergencyOutboxOperation[]> {
  try {
    const all = await withStore<EmergencyOutboxOperation[]>(
      getOutboxStoreName(),
      "readonly",
      (store) => store.getAll(),
    );
    const stale = (all ?? []).filter(
      (op) =>
        op.state === "QUEUED" ||
        op.state === "RETRY_WAIT" ||
        // Lease órfão: aba travada/crash deixou SYNCING — recupera com a
        // MESMA chave (idempotência do servidor protege contra duplicação).
        (op.state === "SYNCING" &&
          (op.lastAttemptAt ?? 0) <= now() - SYNC_CLAIM_TIMEOUT_MS),
    );
    return stale;
  } catch {
    return [];
  }
}

export async function writeOperation(operation: EmergencyOutboxOperation): Promise<void> {
  await withStore(getOutboxStoreName(), "readwrite", (store) => {
    store.put(operation);
  });
}

/**
 * Devolve leases `SYNCING` órfãos a `RETRY_WAIT` (mesma chave, sem consumir
 * tentativa — a operação nunca foi concluída). Executado no início de cada
 * sincronização para que um crash de aba não estrande a operação.
 */
export async function reclaimStaleSyncing(ownerId: string): Promise<void> {
  const nowMs = now();
  const stale = (await listPendingOperations()).filter(
    (op) =>
      op.ownerId === ownerId &&
      op.state === "SYNCING" &&
      op.lastAttemptAt !== null &&
      nowMs - op.lastAttemptAt > SYNC_CLAIM_TIMEOUT_MS,
  );
  for (const op of stale) {
    await writeOperation({
      ...op,
      state: "RETRY_WAIT",
      lastError: "Sincronização anterior interrompida; retomando com a mesma chave.",
    });
  }
}

let syncInFlight = false;

/**
 * Sincroniza operações pendentes do dono autenticado. Seguro para ser
 * chamado a qualquer momento (online, montagem, retry manual): uma única
 * passada declarativa por vez, mesma chave de idempotência em cada retry.
 *
 * O booleano em memória é apenas cortesia intra-aba; a proteção real contra
 * abas concorrentes é o lease `SYNCING` no IndexedDB (reivindicado antes do
 * POST) e a idempotência do servidor como barreira final.
 */
export async function syncEmergencyOutbox(ownerId: string): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    await reclaimStaleSyncing(ownerId);

    const pending = (await listPendingOperations()).filter(
      (op) => op.ownerId === ownerId && op.nextAttemptAt <= now(),
    );

    for (const operation of pending) {
      const startedAt = now();
      await writeOperation({ ...operation, state: "SYNCING", lastAttemptAt: startedAt });

      try {
        const response = await emergencyApi.trigger(
          operation.payload,
          operation.idempotencyKey,
        );
        // Confirmação EXPLÍCITA do servidor (201 ou replay idempotente):
        // só aqui a operação é marcada SYNCED e o ID confirmado é guardado.
        const serverEventId =
          typeof (response as { data?: { id?: unknown } }).data?.id === "string"
            ? (response as { data: { id: string } }).data.id
            : null;
        await writeOperation({
          ...operation,
          state: "SYNCED",
          attempts: operation.attempts + 1,
          lastAttemptAt: startedAt,
          lastError: null,
          serverEventId,
        });
      } catch (error) {
        const classification = classifySyncError(error);
        const attempts = operation.attempts + (classification.attempts ? 1 : 0);

        await writeOperation({
          ...operation,
          state:
            !classification.retryable || attempts >= MAX_ATTEMPTS
              ? "FAILED_PERMANENT"
              : "RETRY_WAIT",
          attempts,
          lastAttemptAt: startedAt,
          nextAttemptAt: now() + backoffDelay(attempts),
          lastError: classification.label,
        });
      }
    }
  } finally {
    syncInFlight = false;
  }
}

/** Verifica se o dono ainda tem operações pendentes de sincronização. */
export async function hasPendingOperations(ownerId: string): Promise<boolean> {
  const pending = await listPendingOperations();
  return pending.some((op) => op.ownerId === ownerId);
}

/**
 * Aborta todas as operações pendentes (não SYNCED) do dono informado.
 * Usado no logout/troca de conta para garantir que operações do usuário anterior
 * nunca sejam enviadas com credenciais do novo usuário.
 * Marca como FAILED_PERMANENT com razão explícita.
 */
export async function abortPendingOperations(ownerId: string, reason = "Sessão encerrada pelo usuário"): Promise<number> {
  const pending = (await listPendingOperations()).filter(
    (op) => op.ownerId === ownerId && op.state !== "SYNCED",
  );
  for (const op of pending) {
    await writeOperation({
      ...op,
      state: "FAILED_PERMANENT",
      lastError: reason,
      nextAttemptAt: Number.MAX_SAFE_INTEGER, // nunca retry
    });
  }
  return pending.length;
}
