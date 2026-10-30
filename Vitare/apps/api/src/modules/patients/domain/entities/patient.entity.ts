import { NumericValue } from '../../../../common/domain/primitives';

/**
 * Agregado Paciente (contexto Patients).
 *
 * Espelha as colunas de domínio persistidas, sem depender do Prisma.
 * O `passwordHash` existe na raiz do agregado, mas nunca vaza para a
 * presentation: use {@link PatientPublic} nas saídas de leitura.
 */
export interface Patient {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  avatarUrl: string | null;
  cpf: string | null;
  phone: string | null;
  address: string | null;
  birthDate: Date | null;
  bloodType: string | null;
  weightKg: NumericValue | null;
  heightCm: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Visão pública do agregado (sem segredos de credencial). */
export type PatientPublic = Omit<Patient, 'passwordHash'>;
