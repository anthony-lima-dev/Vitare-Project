/**
 * Script de backfill: criptografa dados clínicos existentes (plaintext)
 * nas novas colunas *_enc, seguindo o padrão T-08.
 *
 * Lê valores em texto claro das colunas antigas e grava o texto cifrado
 * nas colunas *_enc. Não remove colunas de plaintext (transição dual-escrita).
 *
 * Uso:
 *   ENCRYPTION_KEY=... BLINDED_INDEX_KEY=... DATABASE_URL=... \
 *     npx tsx scripts/backfill-clinical-encryption.ts
 */

import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { EncryptionService } from '../src/common/utils/encryption.util';

async function main() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const blindedIndexKey = process.env.BLINDED_INDEX_KEY;

  if (!encryptionKey || !blindedIndexKey) {
    throw new Error(
      'ENCRYPTION_KEY e BLINDED_INDEX_KEY devem estar definidos no ambiente.',
    );
  }

  const crypto = EncryptionService.fromEnv();
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // ===== ChronicCondition: notes =====
    const conditions = await prisma.chronicCondition.findMany({
      where: { notesEnc: null },
    });
    for (const c of conditions) {
      if (c.notes) {
        await prisma.chronicCondition.update({
          where: { id: c.id },
          data: { notesEnc: crypto.encrypt(c.notes) },
        });
      }
    }
    console.log(`[chronic_conditions] ${conditions.length} verificados`);

    // ===== Allergy: name, severity, notes =====
    const allergies = await prisma.allergy.findMany({
      where: { nameEnc: null },
    });
    for (const a of allergies) {
      const data: Record<string, unknown> = {};
      if (a.name) data.nameEnc = crypto.encrypt(a.name);
      if (a.severity) data.severityEnc = crypto.encrypt(a.severity);
      if (a.notes) data.notesEnc = crypto.encrypt(a.notes);
      if (Object.keys(data).length > 0) {
        await prisma.allergy.update({ where: { id: a.id }, data });
      }
    }
    console.log(`[allergies] ${allergies.length} verificados`);

    // ===== EmergencyContact: name, phone, relationship =====
    const contacts = await prisma.emergencyContact.findMany({
      where: { nameEnc: null },
    });
    for (const c of contacts) {
      const data: Record<string, unknown> = {};
      if (c.name) data.nameEnc = crypto.encrypt(c.name);
      if (c.phone) data.phoneEnc = crypto.encrypt(c.phone);
      if (c.relationship) data.relationshipEnc = crypto.encrypt(c.relationship);
      if (Object.keys(data).length > 0) {
        await prisma.emergencyContact.update({ where: { id: c.id }, data });
      }
    }
    console.log(`[emergency_contacts] ${contacts.length} verificados`);

    // ===== Medication: name, dosage, frequency, notes, dates =====
    const medications = await prisma.medication.findMany({
      where: { nameEnc: null },
    });
    for (const m of medications) {
      const data: Record<string, unknown> = {};
      if (m.name) data.nameEnc = crypto.encrypt(m.name);
      if (m.dosage) data.dosageEnc = crypto.encrypt(m.dosage);
      if (m.frequency) data.frequencyEnc = crypto.encrypt(m.frequency);
      if (m.startDate) data.startDateEnc = crypto.encrypt(m.startDate.toISOString());
      if (m.endDate) data.endDateEnc = crypto.encrypt(m.endDate.toISOString());
      if (m.notes) data.notesEnc = crypto.encrypt(m.notes);
      if (Object.keys(data).length > 0) {
        await prisma.medication.update({ where: { id: m.id }, data });
      }
    }
    console.log(`[medications] ${medications.length} verificados`);

    // ===== MedicationHistory: oldValue, newValue =====
    const histories = await prisma.medicationHistory.findMany({
      where: { oldValueEnc: null },
    });
    for (const h of histories) {
      const data: Record<string, unknown> = {};
      if (h.oldValue) data.oldValueEnc = crypto.encrypt(h.oldValue);
      if (h.newValue) data.newValueEnc = crypto.encrypt(h.newValue);
      if (Object.keys(data).length > 0) {
        await prisma.medicationHistory.update({ where: { id: h.id }, data });
      }
    }
    console.log(`[medication_history] ${histories.length} verificados`);

    // ===== ForbiddenMedication: reason =====
    const forbidden = await prisma.forbiddenMedication.findMany({
      where: { reasonEnc: null },
    });
    for (const f of forbidden) {
      if (f.reason) {
        await prisma.forbiddenMedication.update({
          where: { id: f.id },
          data: { reasonEnc: crypto.encrypt(f.reason) },
        });
      }
    }
    console.log(`[forbidden_medications] ${forbidden.length} verificados`);

    // ===== EmergencyEvent: notes, patientSnapshot =====
    const events = await prisma.emergencyEvent.findMany({
      where: { patientSnapshotEnc: null },
    });
    for (const e of events) {
      const data: Record<string, unknown> = {};
      if (e.notes) data.notesEnc = crypto.encrypt(e.notes);
      if (e.patientSnapshot) {
        data.patientSnapshotEnc = crypto.encrypt(
          JSON.stringify(e.patientSnapshot),
        );
      }
      if (Object.keys(data).length > 0) {
        await prisma.emergencyEvent.update({ where: { id: e.id }, data });
      }
    }
    console.log(`[emergency_events] ${events.length} verificados`);

    console.log('\nBackfill concluído com sucesso.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro no backfill:', err);
  process.exit(1);
});
