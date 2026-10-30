import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import {
  canonicalCpf,
  canonicalEmail,
} from '../../../../common/utils/encryption.util';
import { PatientsRepository } from '../../domain/repositories/patients.repository';
import { Patient } from '../../domain/entities/patient.entity';
import type { LegalActInput } from '../../../legal/domain/entities/legal-act.entity';

@Injectable()
export class PrismaPatientsRepository implements PatientsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async findById(id: string): Promise<Patient | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async update(
    id: string,
    data: Partial<Patient> & { legalActs?: LegalActInput[] },
  ): Promise<Patient> {
    const { legalActs, ...profileData } = data;
    const updateData: Record<string, unknown> = {};

    // Somente texto cifrado + indices cegos (colunas de plaintext removidas
    // na migracao B). Campos clinicos nao identificadores sao copiados como
    // estao.
    if (profileData.fullName !== undefined && profileData.fullName !== null) {
      updateData.fullNameEnc = this.pii.encrypt(profileData.fullName);
    }
    if (profileData.email !== undefined && profileData.email !== null) {
      updateData.emailEnc = this.pii.encrypt(profileData.email);
      updateData.emailBlindedIndex = this.pii.blindIndex(
        canonicalEmail(profileData.email),
      );
    }
    if (profileData.cpf !== undefined && profileData.cpf !== null) {
      updateData.cpfEnc = this.pii.encrypt(profileData.cpf);
      updateData.cpfBlindedIndex = this.pii.blindIndex(
        canonicalCpf(profileData.cpf),
      );
    }
    if (profileData.phone !== undefined && profileData.phone !== null) {
      updateData.phoneEnc = this.pii.encrypt(profileData.phone);
    }
    if (profileData.address !== undefined && profileData.address !== null) {
      updateData.addressEnc = this.pii.encrypt(profileData.address);
    }
    if (profileData.birthDate !== undefined && profileData.birthDate !== null) {
      updateData.birthDateEnc = this.pii.encrypt(
        profileData.birthDate.toISOString(),
      );
    }
    // Converte o Value Object do domínio em Decimal real do Prisma. Passar o
    // objeto { toString, toNumber } diretamente provoca erro de validação em runtime.
    if (profileData.weightKg !== undefined) {
      updateData.weightKg =
        profileData.weightKg === null
          ? null
          : new Prisma.Decimal(profileData.weightKg.toString());
    }

    for (const field of [
      'bloodType',
      'heightCm',
      'passwordHash',
      'googleId',
      'avatarUrl',
    ] as const) {
      const value = (profileData as Record<string, unknown>)[field];
      if (value !== undefined) {
        updateData[field] = value;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Atos jurídicos de primeiro acesso na MESMA transação da ativação do
      // perfil: rollback de qualquer gravação desfaz a outra.
      for (const act of legalActs ?? []) {
        await tx.legalActRecord.create({
          data: {
            actorId: id,
            actorRole: 'USER',
            holderId: id,
            actType: act.actType,
            documentVersion: act.documentVersion,
            contentHash: act.contentHash,
            purpose: this.purposeOf(act.actType),
            legalBasis: this.legalBasisOf(act.actType),
            origin: 'patient-first-access',
            ipHash: null,
          },
        });
      }

      const updated = await tx.user.update({
        where: { id },
        data: updateData as never,
      });
      return this.toEntity(updated);
    });
  }

  /** Finalidade e base legal padrão de cada tipo de ato no onboarding (T-11). */
  private purposeOf(actType: string): string {
    switch (actType) {
      case 'TERMS_OF_USE':
        return 'Aceite dos Termos de Uso (primeiro acesso)';
      case 'PRIVACY_NOTICE':
        return 'Ciência do Aviso de Privacidade (primeiro acesso)';
      case 'EXPLICIT_CONSENT':
        return 'Consentimento explícito (primeiro acesso)';
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

  async remove(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  private toEntity(row: User): Patient {
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
