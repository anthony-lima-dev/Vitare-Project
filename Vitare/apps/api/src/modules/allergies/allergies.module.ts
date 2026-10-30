import { Module } from '@nestjs/common';
import { AllergiesController } from './presentation/http/allergies.controller';
import { AllergiesService } from './application/allergies.service';
import { AllergiesRepository } from './domain/repositories/allergies.repository';
import { PrismaAllergiesRepository } from './infrastructure/prisma/prisma-allergies.repository';

@Module({
  controllers: [AllergiesController],
  providers: [
    AllergiesService,
    { provide: AllergiesRepository, useClass: PrismaAllergiesRepository },
  ],
})
export class AllergiesModule {}
