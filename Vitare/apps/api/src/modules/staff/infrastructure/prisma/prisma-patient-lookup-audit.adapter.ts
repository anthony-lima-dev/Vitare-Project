import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import { canonicalCpf } from '../../../../common/utils/encryption.util';
import {
  PatientLookupAuditEntry,
  PatientLookupAuditPort,
} from '../../domain/ports/patient-lookup-audit.port';

/**
 * Persistencia da trilha de auditoria de consultas por CPF (PostgreSQL).
 *
 * Armazena o INDICE CEGO (HMAC) do CPF pesquisado, nunca o valor direto,
 * de modo que a trilha permita detectar consultas repetidas ao mesmo CPF
 * sem revelar o documento. Best-effort: falha de log nao bloqueia a consulta.
 */
@Injectable()
export class PrismaPatientLookupAuditAdapter implements PatientLookupAuditPort {
  private readonly logger = new Logger(PrismaPatientLookupAuditAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async record(entry: PatientLookupAuditEntry): Promise<void> {
    try {
      await this.prisma.patientLookupAudit.create({
        data: {
          staffId: entry.staffId,
          staffRole: entry.staffRole,
          // Coluna `cpf_searched` (@map). Agora guarda o indice cego (HMAC)
          // do CPF canonico, nao o CPF em plaintext.
          cpfSearched: this.pii.blindIndex(canonicalCpf(entry.cpfQueried)),
          outcome: entry.outcome,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao registrar auditoria de consulta por CPF: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
