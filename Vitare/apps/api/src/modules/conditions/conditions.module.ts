import { Module } from '@nestjs/common';
import { ConditionsController } from './presentation/http/conditions.controller';
import { ConditionsService } from './application/conditions.service';
import { ConditionsRepository } from './domain/repositories/conditions.repository';
import { PrismaConditionsRepository } from './infrastructure/prisma/prisma-conditions.repository';

@Module({
  controllers: [ConditionsController],
  providers: [
    ConditionsService,
    { provide: ConditionsRepository, useClass: PrismaConditionsRepository },
  ],
})
export class ConditionsModule {}
