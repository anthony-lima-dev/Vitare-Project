import { REQUIRED_LEGAL_DOCUMENTS, type LegalActAcceptance } from "@vitare/core-typings";
import type { LegalActRecord, LegalActRecordRequest } from "../../infrastructure/api/legal.api";

export const PENDING_GOOGLE_SIGNUP_ACCEPTANCES_KEY = "vitare:pending-google-signup-acceptances";

export interface LegalAcceptanceApiPort {
  listByHolder(holderId: string): Promise<{ data: LegalActRecord[] }>;
  record(data: LegalActRecordRequest): Promise<unknown>;
}

export async function recordPendingGoogleSignupAcceptances(
  holderId: string,
  api: LegalAcceptanceApiPort,
  storage: Pick<Storage, "getItem" | "removeItem"> = window.sessionStorage,
): Promise<boolean> {
  const raw = storage.getItem(PENDING_GOOGLE_SIGNUP_ACCEPTANCES_KEY);
  if (!raw) return false;

  let pending: LegalActAcceptance[];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Formato de aceite inválido.");
    pending = parsed as LegalActAcceptance[];
  } catch {
    throw new Error("Não foi possível validar os aceites anteriores ao Google. Volte ao cadastro e tente novamente.");
  }

  const documents = REQUIRED_LEGAL_DOCUMENTS;
  const allCurrentAccepted = documents.every((doc) => pending.some((item) =>
    item.actType === doc.actType && item.documentVersion === doc.version && item.contentHash === doc.contentHash));
  if (!allCurrentAccepted) {
    throw new Error("Os documentos foram atualizados durante o cadastro. Volte e aceite as versões vigentes.");
  }

  const existingResponse = await api.listByHolder(holderId);
  const existing = existingResponse.data ?? [];
  for (const doc of documents) {
    const alreadyRecorded = existing.some((record) =>
      record.actType === doc.actType && record.documentVersion === doc.version && record.contentHash === doc.contentHash);
    if (alreadyRecorded) continue;
    await api.record({
      actorId: holderId,
      actorRole: "USER",
      holderId,
      actType: doc.actType,
      documentVersion: doc.version,
      contentHash: doc.contentHash,
      purpose: doc.purpose,
      legalBasis: doc.legalBasis,
      origin: "patient-google-signup-preaccepted",
    });
  }

  storage.removeItem(PENDING_GOOGLE_SIGNUP_ACCEPTANCES_KEY);
  return true;
}
