/**
 * Entidade de domínio: registro de ato jurídico (aceite/ciência/consentimento).
 *
 * Separa três conceitos jurídicos distintos da LGPD:
 * - TERMS_OF_USE: aceite aos Termos de Uso (base contratual)
 * - PRIVACY_NOTICE: ciência do Aviso de Privacidade (transparência)
 * - EXPLICIT_CONSENT: consentimento explícito (base legal de consentimento)
 *
 * Não presume que consentimento seja a única base legal, nem que o
 * aceite genérico autorize todos os tratamentos.
 */
export interface LegalActRecord {
  id: string;
  actorId: string;
  actorRole: string;
  holderId: string;
  actType: LegalActType;
  documentVersion: string;
  contentHash: string;
  purpose: string;
  legalBasis: LegalBasis;
  origin: string;
  ipHash: string | null;
  recordedAt: Date;
}

export type LegalActType =
  'TERMS_OF_USE' | 'PRIVACY_NOTICE' | 'EXPLICIT_CONSENT';

export type LegalBasis =
  | 'CONSENT'
  | 'CONTRACT'
  | 'LEGAL_OBLIGATION'
  | 'VITAL_INTEREST'
  | 'PUBLIC_TASK'
  | 'LEGITIMATE_INTEREST'
  | 'EXERCISE_OF_RIGHTS';

/** Entrada para registro de um novo ato jurídico (append-only). */
export interface RecordLegalActInput {
  actorId: string;
  actorRole: string;
  holderId: string;
  actType: LegalActType;
  documentVersion: string;
  contentHash: string;
  purpose: string;
  legalBasis: LegalBasis;
  origin: string;
  ipHash: string | null;
}

/**
 * Dados mínimos de um aceite coletados no onboarding.
 * `actorId`/`holderId` são preenchidos pelo adaptador de persistência com o
 * id da conta criada/ativada; o restante é validado contra os documentos
 * vigentes antes da gravação.
 */
export interface LegalActInput {
  actType: LegalActType;
  documentVersion: string;
  contentHash: string;
}

/**
 * Documento jurídico exigido em um fluxo de onboarding, com a versão vigente
 * e o hash do conteúdo publicado (SHA-256 do texto da versão).
 */
export interface RequiredLegalDocument {
  actType: LegalActType;
  version: string;
  contentHash: string;
}

/**
 * Base legal aplicada a cada ato de onboarding (T-11):
 * - Termos de Uso: base contratual (necessária à execução do cadastro).
 * - Aviso de Privacidade: obrigação legal de transparência (LGPD).
 *
 * O tratamento de emergência NÃO é condicionado a esses aceites: quando houver
 * outra base legal aplicável (ex. VITAL_INTEREST, LEGAL_OBLIGATION) e política
 * aprovada, o atendimento prossegue independentemente de um sinalizador genérico
 * de consentimento. Consentimento nunca é presumido como a única base legal.
 */

/** Filtro para consulta de registros por titular e tipo de ato. */
export interface LegalActFilter {
  holderId?: string;
  actType?: LegalActType;
  documentVersion?: string;
  from?: Date;
  to?: Date;
}
