/**
 * Contrato versionado do Clinical Snapshot de emergência.
 * Os dados históricos persistidos NÃO são reescritos após o acionamento.
 */
export const CLINICAL_SNAPSHOT_VERSION = '1.1';

export type SnapshotOrigin = 'server' | 'client';

export interface PatientSnapshot {
  snapshotVersion: string;
  origin: SnapshotOrigin;
  capturedAt: string;
  serverReceivedAt: string;
  patient: {
    fullName: string;
    cpf: string | null;
    bloodType: string | null;
    birthDate: string | null;
    weightKg: number | null;
    heightCm: number | null;
  };
  conditions: Array<{ name: string; code: string }>;
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  contacts: Array<{ name: string; phone: string; isPrimary: boolean }>;
  allergies: Array<{
    name: string;
    severity: string | null;
    notes: string | null;
  }>;
  /** Metadados de proveniência de acionamento offline (quando aplicável). */
  sync?: {
    clientTriggeredAt?: string;
    lastClinicalSyncAt?: string;
  };
}

export interface SnapshotSource {
  fullName: string;
  cpf: string | null;
  bloodType: string | null;
  birthDate: Date | null;
  weightKg: unknown;
  heightCm: number | null;
  conditions: Array<{
    notes: string | null;
    disease: { name: string; code: string };
  }>;
  medications: Array<{ name: string; dosage: string; frequency: string }>;
  contacts: Array<{ name: string; phone: string; isPrimary: boolean }>;
  allergies: Array<{
    name: string;
    severity: string | null;
    notes: string | null;
  }>;
}

/**
 * Compõe o snapshot no servidor a partir dos dados persistidos (fonte da
 * verdade). Campos clínicos NUNCA vêm do cliente no modo online.
 */
export function buildServerSnapshot(
  user: SnapshotSource,
  clientTriggeredAt: string | undefined,
  receivedAt: Date,
): PatientSnapshot {
  return {
    snapshotVersion: CLINICAL_SNAPSHOT_VERSION,
    origin: 'server',
    capturedAt: receivedAt.toISOString(),
    serverReceivedAt: receivedAt.toISOString(),
    patient: {
      fullName: user.fullName,
      cpf: user.cpf,
      bloodType: user.bloodType,
      birthDate: user.birthDate?.toISOString() ?? null,
      weightKg:
        user.weightKg !== null && user.weightKg !== undefined
          ? Number(user.weightKg)
          : null,
      heightCm: user.heightCm,
    },
    conditions: user.conditions.map((c) => ({
      name: c.disease.name,
      code: c.disease.code,
    })),
    medications: user.medications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
    })),
    contacts: user.contacts.map((c) => ({
      name: c.name,
      phone: c.phone,
      isPrimary: c.isPrimary,
    })),
    allergies: user.allergies.map((a) => ({
      name: a.name,
      severity: a.severity,
      notes: a.notes,
    })),
    sync: clientTriggeredAt ? { clientTriggeredAt } : undefined,
  };
}

// ===== Sanitização TOLERANTE por allowlist (snapshot vindo do cliente) =====

const MAX_TEXT_LENGTH = 255;
const MAX_CODE_LENGTH = 20;
const MAX_DOSAGE_LENGTH = 100;
const MAX_PHONE_LENGTH = 30;
const MAX_TIMESTAMP_LENGTH = 40;
const MAX_NOTES_LENGTH = 500;
const MAX_SECTION_ITEMS = 50;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

function textOrEmpty(value: unknown, maxLength: number): string {
  return sanitizeText(value, maxLength) ?? '';
}

function sanitizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Projeta apenas itens válidos de uma lista, com limite máximo de itens.
 * Itens malformados são descartados — nunca propagam valores crus.
 */
function sanitizeSection<T>(
  value: unknown,
  project: (item: Record<string, unknown>) => T | null,
): T[] {
  if (!Array.isArray(value)) return [];
  const items: T[] = [];
  for (const raw of value) {
    if (items.length >= MAX_SECTION_ITEMS) break;
    const projected = project(asRecord(raw));
    if (projected !== null) items.push(projected);
  }
  return items;
}

/**
 * Envelopa o snapshot enviado pelo cliente (modo offline) com metadados de
 * proveniência, sem apresentá-lo como confirmado pelo servidor.
 *
 * Caminho crítico de vida: a sanitização é TOLERANTE — payloads malformados
 * NÃO bloqueiam o acionamento. Apenas os campos do contrato são projetados
 * (allowlist); itens inválidos são descartados, listas são limitadas e campos
 * ausentes/inválidos viram valores padrão. Nada fora do contrato é
 * persistido (o payload cru nunca é espalhado no snapshot final).
 */
/**
 * Timestamps só são aceitos quando realmente representam uma data válida;
 * caso contrário o chamador cai no horário do servidor (fallback seguro).
 */
function sanitizeTimestamp(value: unknown, maxLength: number): string | null {
  const text = sanitizeText(value, maxLength);
  if (text === null) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : text;
}

export function buildClientOriginSnapshot(
  clientPayload: Record<string, unknown>,
  receivedAt: Date,
): PatientSnapshot {
  const payload = asRecord(clientPayload);
  const rawPatient = asRecord(payload.patient);
  const rawSync = asRecord(payload.sync);

  const clientTriggeredAt = sanitizeTimestamp(
    rawSync.clientTriggeredAt,
    MAX_TIMESTAMP_LENGTH,
  );
  const lastClinicalSyncAt = sanitizeTimestamp(
    rawSync.lastClinicalSyncAt,
    MAX_TIMESTAMP_LENGTH,
  );

  const sync: PatientSnapshot['sync'] = {};
  if (clientTriggeredAt) sync.clientTriggeredAt = clientTriggeredAt;
  if (lastClinicalSyncAt) sync.lastClinicalSyncAt = lastClinicalSyncAt;

  return {
    snapshotVersion:
      sanitizeText(payload.snapshotVersion, MAX_CODE_LENGTH) ??
      CLINICAL_SNAPSHOT_VERSION,
    origin: 'client',
    capturedAt:
      sanitizeTimestamp(payload.capturedAt, MAX_TIMESTAMP_LENGTH) ??
      receivedAt.toISOString(),
    serverReceivedAt: receivedAt.toISOString(),
    patient: {
      fullName: textOrEmpty(rawPatient.fullName, MAX_TEXT_LENGTH),
      cpf: sanitizeText(rawPatient.cpf, 14),
      bloodType: sanitizeText(rawPatient.bloodType, 5),
      birthDate: sanitizeText(rawPatient.birthDate, 10),
      weightKg: sanitizeNumber(rawPatient.weightKg),
      heightCm: sanitizeNumber(rawPatient.heightCm),
    },
    conditions: sanitizeSection(payload.conditions, (item) => {
      const name = sanitizeText(item.name, MAX_TEXT_LENGTH);
      if (name === null) return null;
      return { name, code: textOrEmpty(item.code, MAX_CODE_LENGTH) };
    }),
    medications: sanitizeSection(payload.medications, (item) => {
      const name = sanitizeText(item.name, MAX_TEXT_LENGTH);
      if (name === null) return null;
      return {
        name,
        dosage: textOrEmpty(item.dosage, MAX_DOSAGE_LENGTH),
        frequency: textOrEmpty(item.frequency, MAX_DOSAGE_LENGTH),
      };
    }),
    contacts: sanitizeSection(payload.contacts, (item) => {
      const name = sanitizeText(item.name, MAX_TEXT_LENGTH);
      const phone = sanitizeText(item.phone, MAX_PHONE_LENGTH);
      if (name === null || phone === null) return null;
      return { name, phone, isPrimary: item.isPrimary === true };
    }),
    allergies: sanitizeSection(payload.allergies, (item) => {
      const name = sanitizeText(item.name, MAX_TEXT_LENGTH);
      if (name === null) return null;
      return {
        name,
        severity: sanitizeText(item.severity, 50),
        notes: sanitizeText(item.notes, MAX_NOTES_LENGTH),
      };
    }),
    ...(Object.keys(sync).length > 0 ? { sync } : {}),
  };
}
