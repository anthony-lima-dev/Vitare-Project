import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMedicationDto } from '../presentation/http/dto/create-medication.dto';
import type { Medication } from '../domain/entities/medication.entity';
import { UpdateMedicationDto } from '../presentation/http/dto/update-medication.dto';
import { MedicationsRepository } from '../domain/repositories/medications.repository';

const AUDITED_FIELDS = [
  'name',
  'dosage',
  'frequency',
  'notes',
  'isActive',
  'medicationsDictionaryId',
] as const satisfies readonly (keyof UpdateMedicationDto)[];

interface HistoryEntryDraft {
  medicationId: string;
  userId: string;
  changedField: string;
  oldValue: string | null;
  newValue: string | null;
}

@Injectable()
export class MedicationsService {
  constructor(private readonly repository: MedicationsRepository) {}

  findAllActiveByUser(userId: string): Promise<Medication[]> {
    return this.repository.findAllActiveByUser(userId);
  }

  async create(userId: string, dto: CreateMedicationDto): Promise<Medication> {
    return this.repository.create({
      userId,
      medicationsDictionaryId: dto.medicationsDictionaryId,
      name: dto.name,
      dosage: dto.dosage,
      frequency: dto.frequency,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      notes: dto.notes,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMedicationDto,
  ): Promise<Medication> {
    const existing = await this.getOwnedOrThrow(id, userId);

    const historyEntries: HistoryEntryDraft[] = AUDITED_FIELDS.filter(
      (field) =>
        dto[field] !== undefined &&
        String(dto[field]) !== String(existing[field]),
    ).map((field) => ({
      medicationId: id,
      userId,
      changedField: field,
      oldValue: existing[field] != null ? String(existing[field]) : null,
      newValue: dto[field] != null ? String(dto[field]) : null,
    }));

    const updated = await this.repository.updateWithHistory(
      id,
      {
        medicationsDictionaryId: dto.medicationsDictionaryId,
        name: dto.name,
        dosage: dto.dosage,
        frequency: dto.frequency,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
        isActive: dto.isActive,
      },
      historyEntries,
    );

    return updated;
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.getOwnedOrThrow(id, userId);
    await this.repository.softDelete(id);
  }

  async getHistory(id: string, userId: string) {
    await this.getOwnedOrThrow(id, userId);
    return this.repository.findHistoryByMedication(id);
  }

  private async getOwnedOrThrow(
    id: string,
    userId: string,
  ): Promise<Medication> {
    const medication = await this.repository.findById(id);
    if (!medication) throw new NotFoundException('Medicamento não encontrado');
    if (medication.userId !== userId)
      throw new ForbiddenException('Você não tem acesso a este recurso');
    return medication;
  }
}
