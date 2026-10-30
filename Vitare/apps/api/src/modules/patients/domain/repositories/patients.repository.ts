import type { LegalActInput } from '../../../legal/domain/entities/legal-act.entity';
import { Patient } from '../entities/patient.entity';

export abstract class PatientsRepository {
  abstract findById(id: string): Promise<Patient | null>;
  /**
   * Atualiza o perfil e, quando `legalActs` for fornecido, grava os atos
   * jurídicos de primeiro acesso na mesma transação (rollback se qualquer
   * gravação falhar).
   */
  abstract update(
    id: string,
    data: Partial<Patient> & { legalActs?: LegalActInput[] },
  ): Promise<Patient>;
  abstract remove(id: string): Promise<void>;
}
