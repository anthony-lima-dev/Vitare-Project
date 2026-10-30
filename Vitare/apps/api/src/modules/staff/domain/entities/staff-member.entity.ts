/** Entidade de staff — contrato usado pela aplicação (sem Prisma). */
export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  cpf: string | null;
  registrationNumber: string;
  role: string;
  passwordHash: string | null;
}
