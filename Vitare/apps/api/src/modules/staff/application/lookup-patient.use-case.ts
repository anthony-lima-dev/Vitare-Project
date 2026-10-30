import { Inject, Injectable } from '@nestjs/common';
import {
  OperationForbiddenError,
  ResourceNotFoundError,
} from '../../../common/errors/domain-error';
import {
  PATIENT_LOOKUP_AUDIT_PORT,
  type PatientLookupAuditEntry,
  type PatientLookupAuditPort,
} from '../domain/ports/patient-lookup-audit.port';
import {
  PatientFullProfile,
  PatientLookupRepository,
} from '../domain/repositories/patient-lookup.repository';

/**
 * Papéis autorizados a consultar o prontuário completo por CPF.
 * OPERADOR_TACTICAL permanece no feed operacional sem acesso clínico.
 */
export const PATIENT_LOOKUP_ALLOWED_ROLES: ReadonlySet<string> = new Set([
  'MEDICO_SOCORRISTA',
  'ENFERMEIRO_SOCORRISTA',
  'TECNICO_ENFERMAGEM',
  'ADMINISTRATIVO',
]);

/**
 * Consulta de prontuário completo por CPF: autorização por papel com
 * trilha de auditoria OBRIGATÓRIA de toda tentativa (FOUND/NOT_FOUND/DENIED).
 */
@Injectable()
export class LookupPatientUseCase {
  constructor(
    private readonly repository: PatientLookupRepository,
    @Inject(PATIENT_LOOKUP_AUDIT_PORT)
    private readonly audit: PatientLookupAuditPort,
  ) {}

  async execute(
    actor: { id: string; role: string },
    cpf: string,
  ): Promise<PatientFullProfile> {
    if (!PATIENT_LOOKUP_ALLOWED_ROLES.has(actor.role)) {
      await this.record({
        staffId: actor.id,
        staffRole: actor.role,
        cpfQueried: cpf,
        outcome: 'DENIED',
      });
      throw new OperationForbiddenError(
        'Seu papel não possui autorização para consultar prontuários de pacientes',
      );
    }

    const profile = await this.repository.findFullProfileByCpf(cpf);

    await this.record({
      staffId: actor.id,
      staffRole: actor.role,
      cpfQueried: cpf,
      outcome: profile ? 'FOUND' : 'NOT_FOUND',
    });

    if (!profile) {
      throw new ResourceNotFoundError(
        'Nenhum paciente encontrado com este CPF',
      );
    }

    return profile;
  }

  /** Auditoria é best-effort: falha de log nunca bloqueia a resposta clínica. */
  private record(entry: PatientLookupAuditEntry): Promise<void> {
    return this.audit.record(entry).catch(() => undefined);
  }
}
