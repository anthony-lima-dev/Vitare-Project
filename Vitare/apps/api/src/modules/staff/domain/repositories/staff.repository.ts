import type { LegalActInput } from '../../../legal/domain/entities/legal-act.entity';
import { StaffMember } from '../entities/staff-member.entity';

export interface CreateStaffData {
  fullName: string;
  email: string;
  cpf: string;
  registrationNumber: string;
  role: string;
  passwordHash: string;
}

export abstract class StaffRepository {
  abstract findByEmail(email: string): Promise<StaffMember | null>;
  abstract findById(id: string): Promise<StaffMember | null>;
  abstract count(): Promise<number>;
  /**
   * Cria profissional com os atos jurídicos de onboarding na mesma transação.
   */
  abstract create(
    data: CreateStaffData & { legalActs?: LegalActInput[] },
  ): Promise<StaffMember>;

  /**
   * Reivindicação ATÔMICA do slot de primeira conta (bootstrap):
   * retorna null quando o slot já foi tomado por requisição concorrente.
   * Os atos jurídicos são gravados na mesma transação.
   */
  abstract createFirstStaff(
    data: CreateStaffData & { legalActs?: LegalActInput[] },
  ): Promise<StaffMember | null>;
}
