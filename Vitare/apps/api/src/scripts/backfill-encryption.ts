import { PrismaService } from '../infra/prisma/prisma.service';
import { PiiEncryptionService } from '../common/infrastructure/encryption/pii-encryption.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BackfillEncryptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pii: PiiEncryptionService,
  ) {}

  async run(): Promise<BackfillReport> {
    const report: BackfillReport = {
      tables: [],
      totalProcessed: 0,
      totalEncrypted: 0,
      errors: [],
    };

    const pii = this.pii;

    // Helper to process a table
    const processTable = async <T extends Record<string, any>>(
      tableName: string,
      findMany: () => Promise<T[]>,
      updateMany: (data: {
        where: { id: string };
        data: Record<string, string>;
      }) => Promise<any>,
      fields: { plain: string; enc: string }[],
    ) => {
      const rows = await findMany();
      let processed = 0;
      let encrypted = 0;
      for (const row of rows) {
        const updates: Record<string, string> = {};
        for (const { plain, enc } of fields) {
          const plainVal = row[plain];
          const encVal = row[enc];
          if (plainVal != null && (encVal == null || encVal === '')) {
            try {
              updates[enc] = pii.encrypt(String(plainVal));
            } catch (e) {
              report.errors.push({
                table: tableName,
                id: row.id,
                field: plain,
                error: String(e),
              });
            }
          }
        }
        if (Object.keys(updates).length > 0) {
          await updateMany({ where: { id: row.id }, data: updates });
          encrypted += Object.keys(updates).length;
        }
        processed++;
      }
      report.tables.push({ table: tableName, processed, encrypted });
      report.totalProcessed += processed;
      report.totalEncrypted += encrypted;
    };

    // Medication
    await processTable(
      'medication',
      () => this.prisma.medication.findMany({ where: { isActive: true } }),
      (args) => this.prisma.medication.update(args),
      [
        { plain: 'name', enc: 'nameEnc' },
        { plain: 'dosage', enc: 'dosageEnc' },
        { plain: 'frequency', enc: 'frequencyEnc' },
        { plain: 'startDate', enc: 'startDateEnc' },
        { plain: 'endDate', enc: 'endDateEnc' },
        { plain: 'notes', enc: 'notesEnc' },
      ],
    );

    // MedicationHistory
    await processTable(
      'medicationHistory',
      () => this.prisma.medicationHistory.findMany(),
      (args) => this.prisma.medicationHistory.update(args),
      [
        { plain: 'oldValue', enc: 'oldValueEnc' },
        { plain: 'newValue', enc: 'newValueEnc' },
      ],
    );

    // ChronicCondition
    await processTable(
      'chronicCondition',
      () => this.prisma.chronicCondition.findMany(),
      (args) => this.prisma.chronicCondition.update(args),
      [{ plain: 'notes', enc: 'notesEnc' }],
    );

    // EmergencyContact
    await processTable(
      'emergencyContact',
      () => this.prisma.emergencyContact.findMany(),
      (args) => this.prisma.emergencyContact.update(args),
      [
        { plain: 'name', enc: 'nameEnc' },
        { plain: 'phone', enc: 'phoneEnc' },
        { plain: 'relationship', enc: 'relationshipEnc' },
      ],
    );

    // Allergy
    await processTable(
      'allergy',
      () => this.prisma.allergy.findMany(),
      (args) => this.prisma.allergy.update(args),
      [
        { plain: 'name', enc: 'nameEnc' },
        { plain: 'severity', enc: 'severityEnc' },
        { plain: 'notes', enc: 'notesEnc' },
      ],
    );

    // ForbiddenMedication
    await processTable(
      'forbiddenMedication',
      () => this.prisma.forbiddenMedication.findMany(),
      (args) => this.prisma.forbiddenMedication.update(args),
      [{ plain: 'reason', enc: 'reasonEnc' }],
    );

    // EmergencyEvent
    await processTable(
      'emergencyEvent',
      () => this.prisma.emergencyEvent.findMany(),
      (args) => this.prisma.emergencyEvent.update(args),
      [
        { plain: 'notes', enc: 'notesEnc' },
        { plain: 'patientSnapshot', enc: 'patientSnapshotEnc' },
      ],
    );

    return report;
  }
}

export interface BackfillReport {
  tables: Array<{ table: string; processed: number; encrypted: number }>;
  totalProcessed: number;
  totalEncrypted: number;
  errors: Array<{ table: string; id: string; field: string; error: string }>;
}
