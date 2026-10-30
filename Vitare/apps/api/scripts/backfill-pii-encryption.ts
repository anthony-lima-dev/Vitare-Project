/**
 * Verificacao de conclusao do backfill de criptografia de PII (T-08).
 *
 * Execucao apos a migracao B (colunas de plaintext removidas). Confirma que
 * toda linha de `users` e `staff` possui texto cifrado preenchido nos campos
 * de identificador, ou seja, o backfill de texto cifrado esta completo.
 *
 * E IDEMPOTENTE: e somente leitura; reexecutar produz o mesmo resultado sem
 * alterar dados. Nao imprime valores identificadores, apenas contadores.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function pct(num: number, den: number): string {
  return den === 0 ? '100%' : `${Math.round((num / den) * 100)}%`;
}

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        emailEnc: true,
        emailBlindedIndex: true,
        cpfEnc: true,
        cpfBlindedIndex: true,
        phoneEnc: true,
        addressEnc: true,
        birthDateEnc: true,
        fullNameEnc: true,
      },
    });
    const staff = await prisma.staff.findMany({
      select: {
        id: true,
        emailEnc: true,
        emailBlindedIndex: true,
        cpfEnc: true,
        cpfBlindedIndex: true,
        fullNameEnc: true,
        registrationNumberEnc: true,
      },
    });

    const userEncFields = users.flatMap((u) => [
      u.emailEnc,
      u.cpfEnc,
      u.phoneEnc,
      u.addressEnc,
      u.birthDateEnc,
      u.fullNameEnc,
    ]);
    const staffEncFields = staff.flatMap((s) => [
      s.emailEnc,
      s.cpfEnc,
      s.fullNameEnc,
      s.registrationNumberEnc,
    ]);

    const usersWithCipher = users.filter(
      (u) => Boolean(u.emailEnc) && Boolean(u.emailBlindedIndex),
    ).length;
    const staffWithCipher = staff.filter(
      (s) => Boolean(s.emailEnc) && Boolean(s.emailBlindedIndex),
    ).length;

    console.log('=== Verificacao de conclusao do backfill PII (T-08) ===');
    console.log(
      `users: ${users.length} linhas, ${usersWithCipher} com e-mail cifrado (${pct(usersWithCipher, users.length)})`,
    );
    console.log(
      `staff: ${staff.length} linhas, ${staffWithCipher} com e-mail cifrado (${pct(staffWithCipher, staff.length)})`,
    );
    console.log(
      `campos cifrados preenchidos: users=${userEncFields.filter(Boolean).length}/${userEncFields.length}, staff=${staffEncFields.filter(Boolean).length}/${staffEncFields.length}`,
    );

    const complete =
      usersWithCipher === users.length &&
      staffWithCipher === staff.length &&
      userEncFields.every(Boolean) &&
      staffEncFields.every(Boolean);

    console.log(
      complete
        ? 'BACKFILL COMPLETO: todos os identificadores estao cifrados.'
        : 'BACKFILL INCOMPLETO: ha campos cifrados nulos.',
    );
    process.exit(complete ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Verificacao falhou:', (error as Error).message);
  process.exit(1);
});
