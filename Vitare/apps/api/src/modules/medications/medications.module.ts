import { Module } from '@nestjs/common';
import { MedicationsController } from './presentation/http/medications.controller';
import { MedicationsService } from './application/medications.service';
import { MedicationsRepository } from './domain/repositories/medications.repository';
import { PrismaMedicationsRepository } from './infrastructure/prisma/prisma-medications.repository';
import { ForbiddenMedicationsModule } from '../forbidden-medications/forbidden-medications.module';

@Module({
  imports: [ForbiddenMedicationsModule],
  controllers: [MedicationsController],
  providers: [
    MedicationsService,
    { provide: MedicationsRepository, useClass: PrismaMedicationsRepository },
  ],
})
export class MedicationsModule {}
