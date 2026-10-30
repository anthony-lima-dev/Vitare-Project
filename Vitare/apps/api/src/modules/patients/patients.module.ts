import { Module } from '@nestjs/common';
import { LegalModule } from '../legal/legal.module';
import { PatientsController } from './presentation/http/patients.controller';
import { PatientsService } from './application/patients.service';
import { PatientsRepository } from './domain/repositories/patients.repository';
import { PrismaPatientsRepository } from './infrastructure/prisma/prisma-patients.repository';

@Module({
  imports: [LegalModule],
  controllers: [PatientsController],
  providers: [
    PatientsService,
    { provide: PatientsRepository, useClass: PrismaPatientsRepository },
  ],
})
export class PatientsModule {}
