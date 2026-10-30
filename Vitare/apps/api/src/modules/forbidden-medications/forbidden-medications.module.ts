// src/modules/forbidden-medications/forbidden-medications.module.ts
import { Module } from '@nestjs/common';
import { ForbiddenMedicationsController } from './presentation/http/forbidden-medications.controller';
import { ForbiddenMedicationsService } from './application/forbidden-medications.service';
import { ForbiddenMedicationsRepository } from './domain/repositories/forbidden-medications.repository';
import { PrismaForbiddenMedicationsRepository } from './infrastructure/prisma/prisma-forbidden-medications.repository';

@Module({
  controllers: [ForbiddenMedicationsController],
  providers: [
    ForbiddenMedicationsService,
    {
      provide: ForbiddenMedicationsRepository,
      useClass: PrismaForbiddenMedicationsRepository,
    },
  ],
  exports: [ForbiddenMedicationsRepository],
})
export class ForbiddenMedicationsModule {}
