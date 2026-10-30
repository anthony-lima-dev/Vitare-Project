import { Inject, Injectable } from '@nestjs/common';
import {
  AssignmentConflictError,
  ResourceNotFoundError,
} from '../../../common/errors/domain-error';
import { EmergencyStatus, isFinalStatus } from '../domain/emergency-status';
import {
  EMERGENCY_REPOSITORY,
  type EmergencyRepositoryPort,
} from './ports/emergency-ports';

/**
 * Resultado MÍNIMO da aceitação — sem snapshot clínico, notas ou dados do
 * paciente na resposta de mutação (defeito 5.3 corrigido).
 */
export interface AcceptEmergencyResult {
  id: string;
  status: EmergencyStatus;
  assignedStaffId: string | null;
  acceptedAt: Date | null;
}

/**
 * Aceitação exclusiva de incidente: a transição condicional só persiste se o
 * incidente ainda estiver em estado aceitável e sem profissional atribuído.
 * Dois profissionais concorrentes → exatamente um vence (updateMany atômico).
 */
@Injectable()
export class AcceptEmergencyUseCase {
  constructor(
    @Inject(EMERGENCY_REPOSITORY)
    private readonly emergencyRepository: EmergencyRepositoryPort,
  ) {}

  async execute(
    eventId: string,
    staffId: string,
  ): Promise<AcceptEmergencyResult> {
    const current = await this.emergencyRepository.findById(eventId);
    if (!current) throw new ResourceNotFoundError('Emergência não encontrada');
    if (isFinalStatus(current.status)) {
      throw new AssignmentConflictError('O incidente já foi encerrado');
    }
    if (current.assignedStaffId && current.assignedStaffId !== staffId) {
      throw new AssignmentConflictError();
    }

    const updated = await this.emergencyRepository.transitionIfCurrent(
      eventId,
      [EmergencyStatus.TRIGGERED, EmergencyStatus.NOTIFIED],
      EmergencyStatus.ACCEPTED,
      { assignedStaffId: staffId },
    );

    if (!updated) throw new AssignmentConflictError();
    return {
      id: updated.id,
      status: updated.status,
      assignedStaffId: updated.assignedStaffId,
      acceptedAt: updated.acceptedAt,
    };
  }
}
