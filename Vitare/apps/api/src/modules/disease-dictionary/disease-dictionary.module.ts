import { Module } from '@nestjs/common';
import { DiseaseDictionaryController } from './presentation/http/disease-dictionary.controller';
import { DiseaseDictionaryService } from './application/disease-dictionary.service';
import { DiseaseDictionaryRepository } from './domain/repositories/disease-dictionary.repository';
import { PrismaDiseaseDictionaryRepository } from './infrastructure/prisma/prisma-disease-dictionary.repository';

@Module({
  controllers: [DiseaseDictionaryController],
  providers: [
    DiseaseDictionaryService,
    {
      provide: DiseaseDictionaryRepository,
      useClass: PrismaDiseaseDictionaryRepository,
    },
  ],
})
export class DiseaseDictionaryModule {}
