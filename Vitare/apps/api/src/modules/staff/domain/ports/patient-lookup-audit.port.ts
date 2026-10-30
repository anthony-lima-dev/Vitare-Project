/**
 * Porta de auditoria de consultas de prontuário por CPF (módulo STAFF).
 * Toda consulta — permitida ou negada — deve ser registrada de forma
 * imutável (trilha de auditoria / LGPD).
 *
 * A porta pertence ao domínio: a aplicação não conhece Prisma.
 */

export type PatientLookupOutcome = 'FOUND' | 'NOT_FOUND' | 'DENIED';

export interface PatientLookupAuditEntry {
  staffId: string;
  staffRole: string;
  cpfQueried: string;
  outcome: PatientLookupOutcome;
}

export interface PatientLookupAuditPort {
  /**
   * Persiste o registro de auditoria. Falhas de auditoria NÃO devem
   * bloquear a resposta operacional (best-effort, log-only no adapter).
   */
  record(entry: PatientLookupAuditEntry): Promise<void>;
}

export const PATIENT_LOOKUP_AUDIT_PORT = Symbol('PATIENT_LOOKUP_AUDIT_PORT');
