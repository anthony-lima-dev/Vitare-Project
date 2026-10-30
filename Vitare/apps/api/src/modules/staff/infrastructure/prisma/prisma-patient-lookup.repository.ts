import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../../../../common/infrastructure/encryption/pii-encryption.service';
import { canonicalCpf } from '../../../../common/utils/encryption.util';
import {
  PatientFullProfile,
  PatientLookupRepository,
} from '../../domain/repositories/patient-lookup.repository';

/**
 * Consulta de prontuario completo por CPF.
 *
 * A igualdade eh feita sobre o indice cego (HMAC do CPF canonico), nunca
 * sobre o valor direto. Os campos do prontuario sao decifrados apenas para
 * montar a resposta ao profissional autorizado.
 */
@Injectable()
export class PrismaPatientLookupRepository implements PatientLookupRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async findFullProfileByCpf(cpf: string): Promise<PatientFullProfile | null> {
    const blinded = this.pii.blindIndex(canonicalCpf(cpf));
    const user = await this.prisma.user.findUnique({
      where: { cpfBlindedIndex: blinded },
      include: {
        conditions: {
          where: { isActive: true },
          include: { disease: true },
        },
        allergies: true,
        medications: true,
        forbiddenMedications: {
          include: { medicationsDictionary: true },
        },
      },
    });

    if (!user) return null;

    const decrypt = (value: string | null): string | null =>
      value ? this.pii.decrypt(value) : null;

    return {
      patient: {
        fullName: decrypt(user.fullNameEnc) ?? '',
        email: decrypt(user.emailEnc) ?? '',
        phone: decrypt(user.phoneEnc) ?? null,
        address: decrypt(user.addressEnc) ?? null,
        birthDate: user.birthDateEnc
          ? new Date(this.pii.decrypt(user.birthDateEnc)).toISOString()
          : null,
        bloodType: user.bloodType,
        weightKg: user.weightKg ? Number(user.weightKg) : null,
        heightCm: user.heightCm,
      },
      conditions: user.conditions.map((c) => ({
        name: c.disease.name,
        code: c.disease.code,
        diagnosedAt: c.diagnosedAt?.toISOString() ?? null,
        notes: decrypt(c.notesEnc ?? c.notes),
      })),
      allergies: user.allergies.map((a) => ({
        name: decrypt(a.nameEnc ?? a.name) ?? '',
        severity: decrypt(a.severityEnc ?? a.severity),
        notes: decrypt(a.notesEnc ?? a.notes),
      })),
      activeMedications: user.medications
        .filter((m) => m.isActive)
        .map((m) => ({
          name: decrypt(m.nameEnc ?? m.name) ?? '',
          dosage: decrypt(m.dosageEnc ?? m.dosage) ?? '',
          frequency: decrypt(m.frequencyEnc ?? m.frequency) ?? '',
          startDate: m.startDate.toISOString(),
        })),
      inactiveMedications: user.medications
        .filter((m) => !m.isActive)
        .map((m) => ({
          name: decrypt(m.nameEnc ?? m.name) ?? '',
          dosage: decrypt(m.dosageEnc ?? m.dosage) ?? '',
          frequency: decrypt(m.frequencyEnc ?? m.frequency) ?? '',
          startDate: m.startDate.toISOString(),
          endDate: m.endDate?.toISOString() ?? null,
        })),
      forbiddenMedications: user.forbiddenMedications.map((f) => ({
        name: f.medicationsDictionary.nome,
        laboratorio: f.medicationsDictionary.laboratorio,
        reason: decrypt(f.reasonEnc ?? f.reason) ?? '',
      })),
    };
  }
}
