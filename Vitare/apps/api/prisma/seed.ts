/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Define o tamanho de cada lote (batch) para inserção
const CHUNK_SIZE = 500;

function resolveSeedDataFile(filename: string): string {
  const candidates = [
    path.join(__dirname, 'data', filename),
    path.join(__dirname, '../../prisma/data', filename),
  ];

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolved) {
    throw new Error(
      `Arquivo de seed não encontrado: ${filename}. Procurados: ${candidates.join(', ')}`,
    );
  }

  return resolved;
}

interface MedicamentoSeed {
  nome: string;
  laboratorio: string;
  substancias: string[];
  apresentacoes: string[];
  tarjas: string[];
}

async function seedDiseases() {
  console.log('🌱 Iniciando o seeding das doenças (DiseaseDictionary)...');
  const diseasesPath = resolveSeedDataFile('CID.json');
  const diseases = JSON.parse(fs.readFileSync(diseasesPath, 'utf-8'));

  for (let i = 0; i < diseases.length; i += CHUNK_SIZE) {
    const chunk = diseases.slice(i, i + CHUNK_SIZE);
    await prisma.diseaseDictionary.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }
  console.log(`✅ ${diseases.length} doenças inseridas com sucesso!`);
}

async function seedGroups() {
  console.log('🌱 Iniciando o seeding dos grupos (DiseaseGroup)...');
  const groupsPath = resolveSeedDataFile('cid_grupos.json');
  const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));

  await prisma.diseaseGroup.createMany({
    data: groups,
    skipDuplicates: true,
  });
  console.log(`✅ ${groups.length} grupos inseridos com sucesso!`);
}

async function seedMedicines() {
  console.log('🌱 Iniciando o seeding dos medicamentos...');
  const medsPath = resolveSeedDataFile('medicamentos.json');

  const medicines: MedicamentoSeed[] = JSON.parse(
    fs.readFileSync(medsPath, 'utf-8'),
  );

  for (let i = 0; i < medicines.length; i += CHUNK_SIZE) {
    const chunk = medicines.slice(i, i + CHUNK_SIZE);

    await prisma.medicationsDictionary.createMany({
      data: chunk.map((med) => ({
        nome: med.nome,
        laboratorio: med.laboratorio,
        substancias: med.substancias,
        apresentacoes: med.apresentacoes,
        tarjas: med.tarjas,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`✅ ${medicines.length} medicamentos inseridos com sucesso!`);
}

async function main() {
  try {
    // Executa as rotinas de seeding em sequência
    await seedGroups();
    await seedDiseases();
    await seedMedicines();
  } catch (error) {
    console.error('❌ Erro durante o seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
