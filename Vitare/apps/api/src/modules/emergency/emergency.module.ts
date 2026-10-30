import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmergencyController } from './presentation/http/emergency.controller';
import { EmergencyGateway } from './presentation/emergency.gateway';
import { EmergencyService } from './application/emergency.service';
import { TriggerEmergencyUseCase } from './application/trigger-emergency.use-case';
import { AcceptEmergencyUseCase } from './application/accept-emergency.use-case';
import { ResolveEmergencyUseCase } from './application/resolve-emergency.use-case';
import { EMERGENCY_REPOSITORY } from './application/ports/emergency-ports';
import { IDEMPOTENCY_STORE } from './application/ports/idempotency-port';
import { PrismaEmergencyRepository } from './infrastructure/prisma/prisma-emergency.repository';
import { PrismaIdempotencyStore } from './infrastructure/prisma-idempotency.store';
import { OutboxDispatcher } from './infrastructure/outbox-dispatcher';

@Module({
  imports: [JwtModule.register({})],
  controllers: [EmergencyController],
  providers: [
    EmergencyService,
    TriggerEmergencyUseCase,
    AcceptEmergencyUseCase,
    ResolveEmergencyUseCase,
    EmergencyGateway,
    OutboxDispatcher,
    { provide: EMERGENCY_REPOSITORY, useClass: PrismaEmergencyRepository },
    { provide: IDEMPOTENCY_STORE, useClass: PrismaIdempotencyStore },
  ],
  exports: [
    AcceptEmergencyUseCase,
    ResolveEmergencyUseCase,
    EMERGENCY_REPOSITORY,
  ],
})
export class EmergencyModule {}
