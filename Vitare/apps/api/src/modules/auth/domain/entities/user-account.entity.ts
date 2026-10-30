import { NumericValue } from '../../../../common/domain/primitives';

/**
 * Conta de usuário (contexto Auth/Identity).
 *
 * Representação ddd do agregado no contexto de autenticação: inclui os
 * segredos de credencial porque este contexto é o único autorizado a
 * verificá-los.
 */
export interface UserAccount {
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

/** Sessão persistida de refresh token. */
export interface RefreshTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

/** Token de recuperação de senha. */
export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}
