import { Module } from '@nestjs/common';
import { MedicationsDictionaryController } from './presentation/http/medications-dictionary.controller';
import { MedicationsDictionaryService } from './application/medications-dictionary.service';
import { MedicationsDictionaryRepository } from './domain/repositories/medications-dictionary.repository';
import { PrismaMedicationsDictionaryRepository } from './infrastructure/prisma/prisma-medications-dictionary.repository';

@Module({
  controllers: [MedicationsDictionaryController],
  providers: [
    MedicationsDictionaryService,
    {
      provide: MedicationsDictionaryRepository,
      useClass: PrismaMedicationsDictionaryRepository,
    },
  ],
})
export class MedicationsDictionaryModule {}
