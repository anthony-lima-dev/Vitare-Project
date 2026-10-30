import { Injectable } from '@nestjs/common';
import { User } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import { canonicalEmail } from '../../../../common/utils/encryption.util';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { UserAccount } from '../../domain/entities/user-account.entity';
import type { LegalActInput } from '../../../../modules/legal/domain/entities/legal-act.entity';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async findByEmail(email: string): Promise<UserAccount | null> {
    // Lookup unico pelo indice cego (HMAC do e-mail canonico). A coluna de
    // plaintext foi removida (migracao B): nao ha mais fallback.
    const blinded = this.pii.blindIndex(canonicalEmail(email));
    const row = await this.prisma.user.findUnique({
      where: { emailBlindedIndex: blinded },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<UserAccount | null> {
    const row = await this.prisma.user.findUnique({ where: { googleId } });
    return row ? this.toEntity(row) : null;
  }

  async findById(id: string): Promise<UserAccount | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async createLocalUser(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    legalActs?: LegalActInput[];
  }): Promise<UserAccount> {
    return this.createUser(
      {
        fullName: data.fullName,
        email: data.email,
        passwordHash: data.passwordHash,
      },
      data.legalActs,
      'USER',
      'patient-register',
    );
  }

  async createGoogleUser(data: {
    fullName: string;
    email: string;
    googleId: string;
    avatarUrl?: string;
    legalActs?: LegalActInput[];
  }): Promise<UserAccount> {
    return this.createUser(
      {
        fullName: data.fullName,
        email: data.email,
        passwordHash: undefined,
        googleId: data.googleId,
        avatarUrl: data.avatarUrl ?? null,
      },
      data.legalActs,
      'USER',
      'google-oauth',
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async storeRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, revokedAt: true },
    });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({ data });
  }

  findPasswordResetToken(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
  }

  async markPasswordResetTokenUsed(tokenHash: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
  }

  async rotateRefreshToken(
    tokenHash: string,
    sucessor: { tokenHash: string; expiresAt: Date },
  ): Promise<
    | { outcome: 'rotated'; userId: string }
    | { outcome: 'not_found' | 'expired' | 'reused' }
  > {
    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findFirst({
        where: { tokenHash },
      });
      if (!stored) return { outcome: 'not_found' };

      const consumed = await tx.refreshToken.updateMany({
        where: {
          id: stored.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });

      if (consumed.count === 0) {
        if (stored.revokedAt) {
          await tx.refreshToken.updateMany({
            where: { userId: stored.userId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          return { outcome: 'reused' };
        }
        return { outcome: 'expired' };
      }

      await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: sucessor.tokenHash,
          expiresAt: sucessor.expiresAt,
        },
      });

      return { outcome: 'rotated', userId: stored.userId };
    });
  }

  async consumePasswordResetAndRotateCredentials(
    tokenHash: string,
    passwordHash: string,
  ): Promise<{ outcome: 'consumed'; userId: string } | { outcome: 'invalid' }> {
    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.passwordResetToken.findFirst({
        where: { tokenHash },
      });
      if (!stored) return { outcome: 'invalid' };

      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: stored.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count === 0) return { outcome: 'invalid' };

      await tx.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return { outcome: 'consumed', userId: stored.userId };
    });
  }

  /* ============ Internos: cifragem/decifragem de PII ============ */

  private async createUser(
    data: {
      fullName: string;
      email: string;
      passwordHash?: string;
      googleId?: string;
      avatarUrl?: string | null;
    },
    legalActs: LegalActInput[] = [],
    actorRole: string = 'USER',
    origin: string = 'patient-register',
  ): Promise<UserAccount> {
    return this.prisma.$transaction(async (tx) => {
      const canonicalEmailValue = canonicalEmail(data.email);
      const row = await tx.user.create({
        data: {
          passwordHash: data.passwordHash ?? null,
          googleId: data.googleId ?? null,
          avatarUrl: data.avatarUrl ?? null,
          fullNameEnc: this.pii.encrypt(data.fullName),
          emailEnc: this.pii.encrypt(data.email),
          emailBlindedIndex: this.pii.blindIndex(canonicalEmailValue),
        },
      });

      // Atos jurídicos de onboarding na MESMA transação: se qualquer um
      // falhar, a conta não é criada (rollback). actorId/holderId = id da
      // conta recém-criada; nenhum dado direto do titular é armazenado no ato.
      for (const act of legalActs) {
        await tx.legalActRecord.create({
          data: {
            actorId: row.id,
            actorRole,
            holderId: row.id,
            actType: act.actType,
            documentVersion: act.documentVersion,
            contentHash: act.contentHash,
            purpose: this.purposeOf(act.actType),
            legalBasis: this.legalBasisOf(act.actType),
            origin,
            ipHash: null,
          },
        });
      }

      return this.toEntity(row);
    });
  }

  /** Finalidade e base legal padrão de cada tipo de ato no onboarding (T-11). */
  private purposeOf(actType: string): string {
    switch (actType) {
      case 'TERMS_OF_USE':
        return 'Aceite dos Termos de Uso (cadastro de paciente)';
      case 'PRIVACY_NOTICE':
        return 'Ciência do Aviso de Privacidade (cadastro de paciente)';
      case 'EXPLICIT_CONSENT':
        return 'Consentimento explícito (cadastro de paciente)';
      default:
        return 'Ato jurídico de onboarding';
    }
  }

  private legalBasisOf(
    actType: string,
  ): 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION' {
    switch (actType) {
      case 'TERMS_OF_USE':
        return 'CONTRACT';
      case 'PRIVACY_NOTICE':
        return 'LEGAL_OBLIGATION';
      case 'EXPLICIT_CONSENT':
        return 'CONSENT';
      default:
        return 'CONTRACT';
    }
  }

  /**
   * Mapeia linha do Prisma (apenas texto cifrado nos identificadores) para
   * a entidade de dominio com PII decifrada. Nunca expõe ciphertext.
   */
  private toEntity(row: User): UserAccount {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    const birthDate = row.birthDateEnc
      ? new Date(this.pii.decrypt(row.birthDateEnc))
      : null;

    return {
      id: row.id,
      fullName: decrypt(row.fullNameEnc) ?? '',
      email: decrypt(row.emailEnc) ?? '',
      passwordHash: row.passwordHash,
      googleId: row.googleId,
      avatarUrl: row.avatarUrl,
      cpf: decrypt(row.cpfEnc) ?? null,
      phone: decrypt(row.phoneEnc) ?? null,
      address: decrypt(row.addressEnc) ?? null,
      birthDate,
      bloodType: row.bloodType,
      weightKg: row.weightKg,
      heightCm: row.heightCm,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
