import type { LegalActInput } from '../../../../modules/legal/domain/entities/legal-act.entity';
import {
  PasswordResetTokenRecord,
  RefreshTokenRecord,
  UserAccount,
} from '../entities/user-account.entity';

export abstract class AuthRepository {
  abstract findByEmail(email: string): Promise<UserAccount | null>;
  abstract findByGoogleId(googleId: string): Promise<UserAccount | null>;
  abstract findById(id: string): Promise<UserAccount | null>;
  /**
   * Cria conta local com os atos jurídicos de onboarding na mesma transação:
   * se qualquer gravação falhar, a conta não é criada (rollback).
   */
  abstract createLocalUser(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    legalActs?: LegalActInput[];
  }): Promise<UserAccount>;
  /**
   * Cria conta vinculada ao Google com os atos jurídicos de onboarding na
   * mesma transação, quando fornecidos (cadastro federado). Quando ausentes,
   * o aceite é coletado no primeiro acesso (`/completar-cadastro`).
   */
  abstract createGoogleUser(data: {
    fullName: string;
    email: string;
    googleId: string;
    avatarUrl?: string;
    legalActs?: LegalActInput[];
  }): Promise<UserAccount>;
  abstract updatePassword(userId: string, passwordHash: string): Promise<void>;

  abstract storeRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  abstract findRefreshToken(
    tokenHash: string,
  ): Promise<RefreshTokenRecord | null>;
  abstract revokeRefreshToken(tokenHash: string): Promise<void>;
  abstract revokeAllRefreshTokens(userId: string): Promise<void>;

  abstract createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  abstract findPasswordResetToken(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null>;
  abstract markPasswordResetTokenUsed(tokenHash: string): Promise<void>;

  /**
   * Rotação atômica do refresh token: consome condicionalmente o token
   * atual (apenas se válido e não revogado) e insere o sucessor na MESMA
   * transação. Reuso de token já consumido revoga toda a família do usuário.
   */
  abstract rotateRefreshToken(
    tokenHash: string,
    sucessor: { tokenHash: string; expiresAt: Date },
  ): Promise<
    | { outcome: 'rotated'; userId: string }
    | { outcome: 'not_found' | 'expired' | 'reused' }
  >;

  /**
   * Consumo transacional do token de recuperação + troca de senha + revogação
   * de sessões — as três escritas acontecem atomicamente (nunca parciais).
   */
  abstract consumePasswordResetAndRotateCredentials(
    tokenHash: string,
    passwordHash: string,
  ): Promise<{ outcome: 'consumed'; userId: string } | { outcome: 'invalid' }>;
}
