import { apiClient } from "./client";
import type { LegalActAcceptance } from "@vitare/core-typings";

export interface LegalActRecord {
  id: string;
  actorId: string;
  actorRole: string;
  holderId: string;
  actType: string;
  documentVersion: string;
  contentHash: string;
  purpose: string;
  legalBasis: string;
  origin: string;
  ipHash: string | null;
  recordedAt: string;
}

export interface LegalActRecordRequest {
  actorId: string;
  actorRole: string;
  holderId: string;
  actType: LegalActAcceptance["actType"];
  documentVersion: string;
  contentHash: string;
  purpose: string;
  legalBasis: string;
  origin: string;
  ipHash?: string | null;
}

export const legalApi = {
  listByHolder: (holderId: string) =>
    apiClient.get<LegalActRecord[]>(`/legal-acts/holder/${holderId}`),
  record: (data: LegalActRecordRequest) =>
    apiClient.post("/legal-acts", data),
};