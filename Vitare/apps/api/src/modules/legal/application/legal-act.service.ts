import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LegalActRepository } from '../domain/repositories/legal-act.repository';
import {
  LEGAL_ACT_AUDIT_PORT,
  type LegalActAuditPort,
} from '../domain/ports/legal-act-audit.port';
import type {
  LegalActFilter,
  LegalActInput,
  LegalActRecord,
  LegalActType,
  RequiredLegalDocument,
} from '../domain/entities/legal-act.entity';
import { Inject } from '@nestjs/common';

/**
 * Serviço de registro e consulta de atos jurídicos (T-10/T-11).
 *
 * Garante:
 * - Append-only: apenas criação; não permite sobrescrever eventos históricos.
 * - Separação de conceitos: TERMS_OF_USE, PRIVACY_NOTICE, EXPLICIT_CONSENT.
 * - Consentimento não é presumido como única base legal.
 * - Dados minimizados: IP armazenado como hash, sem PII desnecessária.
 */
@Injectable()
export class LegalActService {
  constructor(
    private readonly repository: LegalActRepository,
    @Inject(LEGAL_ACT_AUDIT_PORT)
    private readonly audit: LegalActAuditPort,
    private readonly config: ConfigService,
  ) {}

  /**
   * Documentos jurídicos exigidos no onboarding, com a versão vigente e o
   * hash do conteúdo publicado. Configurado por variáveis de ambiente com
   * fallbacks seguros para desenvolvimento (ver `configuration.ts`).
   */
  private get requiredOnboardingDocuments(): RequiredLegalDocument[] {
    const legal = this.config.get<Record<string, RequiredLegalDocument>>(
      'LEGAL.requiredDocuments',
    );
    if (!legal) return [];
    return Object.entries(legal).map(([actType, doc]) => ({
      actType: actType as LegalActType,
      version: doc.version,
      contentHash: doc.contentHash,
    }));
  }

  /**
   * Valida que o titular aceitou TODOS os documentos exigidos na versão
   * vigente (versão e hash do conteúdo devem coincidir exatamente).
   * Versão antiga ou hash divergente → rejeita (nada é gravado).
   * Aceitar uma versão nova não sobrescreve o histórico: cada aceite é um
   * registro separado (append-only, T-10).
   */
  validateOnboardingAcceptance(legalActs: LegalActInput[]): void {
    const required = this.requiredOnboardingDocuments;
    for (const doc of required) {
      const accepted = legalActs.some(
        (act) =>
          act.actType === doc.actType &&
          act.documentVersion === doc.version &&
          act.contentHash === doc.contentHash,
      );
      if (!accepted) {
        throw new BadRequestException(
          `Aceite obrigatório ausente ou desatualizado: ${doc.actType} ${doc.version}.`,
        );
      }
    }
  }

  /**
   * Verifica se já existe aceitação vigente de todos os documentos
   * exigidos para o titular (usa para liberar/bloquear avanço no onboarding).
   */
  async hasCurrentAcceptance(holderId: string): Promise<boolean> {
    const records = await this.repository.findByHolder({ holderId });
    const byType = new Map<string, LegalActRecord[]>();
    for (const record of records) {
      const list = byType.get(record.actType) ?? [];
      list.push(record);
      byType.set(record.actType, list);
    }
    return this.requiredOnboardingDocuments.every((doc) =>
      (byType.get(doc.actType) ?? []).some(
        (record) =>
          record.documentVersion === doc.version &&
          record.contentHash === doc.contentHash,
      ),
    );
  }

  /**
   * Registra um novo ato jurídico. O hash do conteúdo é calculado pelo chamador
   * (ex. SHA-256 do texto da versão do documento) e passado como parâmetro.
   * Não há verificação de unicidade que bloqueie re-aceite: o mesmo titular
   * pode aceitar a mesma versão múltiplas vezes (cada aceite é um evento).
   */
  async recordLegalAct(input: {
    actorId: string;
    actorRole: string;
    holderId: string;
    actType: LegalActType;
    documentVersion: string;
    contentHash: string;
    purpose: string;
    legalBasis: LegalActRecord['legalBasis'];
    origin: string;
    ipHash: string | null;
  }): Promise<LegalActRecord> {
    const record = await this.repository.create({
      actorId: input.actorId,
      actorRole: input.actorRole,
      holderId: input.holderId,
      actType: input.actType,
      documentVersion: input.documentVersion,
      contentHash: input.contentHash,
      purpose: input.purpose,
      legalBasis: input.legalBasis,
      origin: input.origin,
      ipHash: input.ipHash,
    });

    // Auditoria best-effort: falha de log não bloqueia o registro principal.
    void this.audit
      .record({
        actorId: input.actorId,
        actorRole: input.actorRole,
        holderId: input.holderId,
        actType: input.actType,
        documentVersion: input.documentVersion,
        contentHash: input.contentHash,
        purpose: input.purpose,
        legalBasis: input.legalBasis,
        origin: input.origin,
        ipHash: input.ipHash,
      })
      .catch(() => undefined);

    return record;
  }

  /**
   * Lista todos os atos registrados para um titular, com filtros opcionais.
   * Acesso restrito: apenas o próprio titular ou papéis autorizados devem
   * chamar este método (a regra de autorização é imposta no controller).
   */
  async findByHolder(
    holderId: string,
    filter?: LegalActFilter,
  ): Promise<LegalActRecord[]> {
    return this.repository.findByHolder({ holderId, ...filter });
  }

  async findByActor(actorId: string): Promise<LegalActRecord[]> {
    return this.repository.findByActor(actorId);
  }

  async countByHolderAndType(
    holderId: string,
    actType: LegalActType,
  ): Promise<number> {
    return this.repository.countByHolderAndType(holderId, actType);
  }
}
