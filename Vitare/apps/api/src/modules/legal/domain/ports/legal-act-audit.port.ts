/**
 * Porta de saída para registro de atos jurídicos em trilha de auditoria.
 * Pertence ao domínio: a aplicação não conhece Prisma.
 *
 * O registro é best-effort: falha de auditoria não bloqueia a ação do usuário,
 * mas deve ser logada para investigação posterior.
 */
export type LegalActOutcome = 'RECORDED' | 'FAILED';

export interface LegalActAuditEntry {
  actorId: string;
  actorRole: string;
  holderId: string;
  actType: 'TERMS_OF_USE' | 'PRIVACY_NOTICE' | 'EXPLICIT_CONSENT';
  documentVersion: string;
  contentHash: string;
  purpose: string;
  legalBasis:
    | 'CONSENT'
    | 'CONTRACT'
    | 'LEGAL_OBLIGATION'
    | 'VITAL_INTEREST'
    | 'PUBLIC_TASK'
    | 'LEGITIMATE_INTEREST'
    | 'EXERCISE_OF_RIGHTS';
  origin: string;
  ipHash: string | null;
}

export interface LegalActAuditPort {
  record(entry: LegalActAuditEntry): Promise<void>;
}

export const LEGAL_ACT_AUDIT_PORT = Symbol('LEGAL_ACT_AUDIT_PORT');
