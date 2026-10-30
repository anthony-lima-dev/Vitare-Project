import { Module } from '@nestjs/common';
import { LegalActController } from './presentation/http/legal-act.controller';
import { LegalActService } from './application/legal-act.service';
import { LegalActRepository } from './domain/repositories/legal-act.repository';
import { PrismaLegalActRepository } from './infrastructure/prisma/prisma-legal-act.repository';
import { LEGAL_ACT_AUDIT_PORT } from './domain/ports/legal-act-audit.port';

@Module({
  controllers: [LegalActController],
  providers: [
    LegalActService,
    { provide: LegalActRepository, useClass: PrismaLegalActRepository },
    { provide: LEGAL_ACT_AUDIT_PORT, useClass: PrismaLegalActRepository },
  ],
  exports: [LegalActService, LegalActRepository, LEGAL_ACT_AUDIT_PORT],
})
export class LegalModule {}
