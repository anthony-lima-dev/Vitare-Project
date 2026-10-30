import { Inject, Injectable } from '@nestjs/common';
import {
  InvalidEmergencyTransitionError,
  OperationForbiddenError,
  ResourceNotFoundError,
} from '../../../common/errors/domain-error';
import { EmergencyStatus } from '../domain/emergency-status';
import {
  EMERGENCY_REPOSITORY,
  type EmergencyEventRecord,
  type EmergencyRepositoryPort,
} from './ports/emergency-ports';

/**
 * Resultado MÍNIMO do encerramento — deliberadamente sem snapshot clínico,
 * notas ou dados do paciente: mutações não devolvem payload clínico completo.
 */
export interface ResolveEmergencyResult {
  id: string;
  status: EmergencyStatus;
  assignedStaffId: string | null;
  resolvedAt: Date | null;
  /** true quando o evento já estava RESOLVED (retorno idempotente autorizado). */
  alreadyResolved: boolean;
}

/**
 * Encerramento do incidente: somente o profissional atribuído resolve, e a
 * transição é condicional ao estado corrente (concorrência segura).
 *
 * A AUTORIZAÇÃO é avaliada ANTES do retorno idempotente: o early-return de
 * eventos já encerrados jamais pode vazar o evento/snapshot para outro
 * profissional autenticado que conheça o UUID (defeito 5.4 corrigido).
 */
@Injectable()
export class ResolveEmergencyUseCase {
  constructor(
    @Inject(EMERGENCY_REPOSITORY)
    private readonly emergencyRepository: EmergencyRepositoryPort,
  ) {}

  async execute(
    eventId: string,
    staffId: string,
  ): Promise<ResolveEmergencyResult> {
    const current = await this.emergencyRepository.findById(eventId);
    if (!current) throw new ResourceNotFoundError('Emergência não encontrada');

    // 1) Autorização primeiro — inclusive para eventos já encerrados.
    if (current.assignedStaffId !== staffId) {
      throw new OperationForbiddenError(
        'Somente o profissional atribuído pode encerrar o incidente',
      );
    }

    // 2) Somente então o retorno idempotente do estado terminal.
    if (current.status === EmergencyStatus.RESOLVED) {
      return {
        id: current.id,
        status: current.status,
        assignedStaffId: current.assignedStaffId,
        resolvedAt: current.resolvedAt,
        alreadyResolved: true,
      };
    }

    // 3) Transição condicional atômica (dois dispatchers → um vencedor).
    const updated = await this.emergencyRepository.transitionIfCurrent(
      eventId,
      [EmergencyStatus.ACCEPTED],
      EmergencyStatus.RESOLVED,
      {},
    );

    if (!updated) {
      throw new InvalidEmergencyTransitionError(
        current.status,
        EmergencyStatus.RESOLVED,
      );
    }
    return toResult(updated, false);
  }
}

function toResult(
  record: EmergencyEventRecord,
  alreadyResolved: boolean,
): ResolveEmergencyResult {
  return {
    id: record.id,
    status: record.status,
    assignedStaffId: record.assignedStaffId,
    resolvedAt: record.resolvedAt,
    alreadyResolved,
  };
}
