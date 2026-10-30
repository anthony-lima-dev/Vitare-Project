import { Injectable } from '@nestjs/common';
import type { Staff, StaffRole } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import {
  canonicalCpf,
  canonicalEmail,
} from '../../../../common/utils/encryption.util';
import { StaffMember } from '../../domain/entities/staff-member.entity';
import {
  CreateStaffData,
  StaffRepository,
} from '../../domain/repositories/staff.repository';
import type { LegalActInput } from '../../../legal/domain/entities/legal-act.entity';

const STAFF_BOOTSTRAP_LOCK_KEY = 'vitare:staff:bootstrap';

const STAFF_LEGAL_ACT_ORIGIN = {
  bootstrap: 'staff-bootstrap',
  provisioning: 'staff-provisioning',
} as const;

@Injectable()
export class PrismaStaffRepository implements StaffRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async findByEmail(email: string): Promise<StaffMember | null> {
    const blinded = this.pii.blindIndex(canonicalEmail(email));
    const row = await this.prisma.staff.findUnique({
      where: { emailBlindedIndex: blinded },
    });
    return row ? this.toEntity(row) : null;
  }

  async findById(id: string): Promise<StaffMember | null> {
    const row = await this.prisma.staff.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async count(): Promise<number> {
    return this.prisma.staff.count();
  }

  async create(
    data: CreateStaffData & { legalActs?: LegalActInput[] },
  ): Promise<StaffMember> {
    const canonicalEmailValue = canonicalEmail(data.email);
    const canonicalCpfValue = canonicalCpf(data.cpf);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.staff.create({
        data: {
          role: data.role as StaffRole,
          passwordHash: data.passwordHash,
          fullNameEnc: this.pii.encrypt(data.fullName),
          emailEnc: this.pii.encrypt(data.email),
          emailBlindedIndex: this.pii.blindIndex(canonicalEmailValue),
          cpfEnc: this.pii.encrypt(data.cpf),
          cpfBlindedIndex: this.pii.blindIndex(canonicalCpfValue),
          registrationNumberEnc: this.pii.encrypt(data.registrationNumber),
        },
      });

      for (const act of data.legalActs ?? []) {
        await tx.legalActRecord.create({
          data: {
            actorId: row.id,
            actorRole: data.role,
            holderId: row.id,
            actType: act.actType,
            documentVersion: act.documentVersion,
            contentHash: act.contentHash,
            purpose: this.purposeOf(act.actType),
            legalBasis: this.legalBasisOf(act.actType),
            origin: STAFF_LEGAL_ACT_ORIGIN.provisioning,
            ipHash: null,
          },
        });
      }

      return this.toEntity(row);
    });
  }

  async createFirstStaff(
    data: CreateStaffData & { legalActs?: LegalActInput[] },
  ): Promise<StaffMember | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${STAFF_BOOTSTRAP_LOCK_KEY}))`;

      const existingCount = await tx.staff.count();
      if (existingCount > 0) return null;

      const canonicalEmailValue = canonicalEmail(data.email);
      const canonicalCpfValue = canonicalCpf(data.cpf);
      const staff = await tx.staff.create({
        data: {
          role: data.role as StaffRole,
          passwordHash: data.passwordHash,
          fullNameEnc: this.pii.encrypt(data.fullName),
          emailEnc: this.pii.encrypt(data.email),
          emailBlindedIndex: this.pii.blindIndex(canonicalEmailValue),
          cpfEnc: this.pii.encrypt(data.cpf),
          cpfBlindedIndex: this.pii.blindIndex(canonicalCpfValue),
          registrationNumberEnc: this.pii.encrypt(data.registrationNumber),
        },
      });

      for (const act of data.legalActs ?? []) {
        await tx.legalActRecord.create({
          data: {
            actorId: staff.id,
            actorRole: data.role,
            holderId: staff.id,
            actType: act.actType,
            documentVersion: act.documentVersion,
            contentHash: act.contentHash,
            purpose: this.purposeOf(act.actType),
            legalBasis: this.legalBasisOf(act.actType),
            origin: STAFF_LEGAL_ACT_ORIGIN.bootstrap,
            ipHash: null,
          },
        });
      }

      return this.toEntity(staff);
    });
  }

  /** Finalidade e base legal padrão de cada tipo de ato no onboarding (T-11). */
  private purposeOf(actType: string): string {
    switch (actType) {
      case 'TERMS_OF_USE':
        return 'Aceite dos Termos de Uso (provisão de staff)';
      case 'PRIVACY_NOTICE':
        return 'Ciência do Aviso de Privacidade (provisão de staff)';
      case 'EXPLICIT_CONSENT':
        return 'Consentimento explícito (provisão de staff)';
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

  private toEntity(staff: Staff): StaffMember {
    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      id: staff.id,
      fullName: decrypt(staff.fullNameEnc) ?? '',
      email: decrypt(staff.emailEnc) ?? '',
      cpf: decrypt(staff.cpfEnc) ?? null,
      registrationNumber: decrypt(staff.registrationNumberEnc) ?? '',
      role: staff.role,
      passwordHash: staff.passwordHash,
    };
  }
}
