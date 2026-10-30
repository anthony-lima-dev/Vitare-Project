import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { RedisService } from './infra/redis/redis.service';
import { RedisThrottlerStorage } from './infra/throttler/redis-throttler.storage';
import { HardenedThrottlerGuard } from './infra/throttler/hardened-throttler.guard';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ConditionsModule } from './modules/conditions/conditions.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './modules/auth/presentation/http/guards/jwt-auth.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { DomainErrorFilter } from './common/filters/domain-error.filter';
import { IsFlexiblePasswordConstraint } from './common/decorators/is-flexible-password.decorator';
import { PiiEncryptionModule } from './common/infrastructure/encryption/pii-encryption.module';
import configuration from './config/configuration';
import { DiseaseDictionaryModule } from './modules/disease-dictionary/disease-dictionary.module';
import { MedicationsDictionaryModule } from './modules/medications-dictionary/medications-dictionary.module';
import { AllergiesModule } from './modules/allergies/allergies.module';
import { ForbiddenMedicationsModule } from './modules/forbidden-medications/forbidden-medications.module';
import { StaffModule } from './modules/staff/staff.module';
import { LegalModule } from './modules/legal/legal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRootAsync({
      // Limites globais configuráveis por env; defaults conservadores.
      inject: [ConfigService, RedisService],
      useFactory: (config: ConfigService, redis: RedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL') ?? 60_000,
            limit: config.get<number>('THROTTLE_LIMIT') ?? 100,
          },
        ],
        // Storage compartilhado: Redis quando disponível (limites valem entre
        // réplicas); fallback in-memory por instância quando indisponível.
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    PrismaModule,
    RedisModule,
    PiiEncryptionModule,
    AuthModule,
    PatientsModule,
    ConditionsModule,
    MedicationsModule,
    ContactsModule,
    EmergencyModule,
    HealthModule,
    DiseaseDictionaryModule,
    MedicationsDictionaryModule,
    AllergiesModule,
    ForbiddenMedicationsModule,
    StaffModule,
    LegalModule,
  ],
  providers: [
    // Motor do @IsFlexiblePassword — registrado para que o class-validator,
    // integrado ao contêiner do Nest (useContainer), injete o ConfigService.
    IsFlexiblePasswordConstraint,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: HardenedThrottlerGuard },
    // Ordem importa: DomainError (regras de negócio) antes de Prisma (dados).
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
