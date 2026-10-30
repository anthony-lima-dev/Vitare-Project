import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { EmergencyModule } from '../emergency/emergency.module';
import { LegalModule } from '../legal/legal.module';
import { StaffAuthController } from './presentation/http/staff-auth.controller';
import { StaffAuthService } from './application/staff-auth.service';
import { EmergencyFeedController } from './presentation/http/emergency-feed.controller';
import { PatientLookupController } from './presentation/http/patient-lookup.controller';
import { StaffJwtStrategy } from './presentation/http/strategies/staff-jwt.strategy';
import { StaffRepository } from './domain/repositories/staff.repository';
import { PrismaStaffRepository } from './infrastructure/prisma/prisma-staff.repository';
import { EmergencyFeedRepository } from './domain/repositories/emergency-feed.repository';
import { PrismaEmergencyFeedRepository } from './infrastructure/prisma/prisma-emergency-feed.repository';
import { PatientLookupRepository } from './domain/repositories/patient-lookup.repository';
import { PrismaPatientLookupRepository } from './infrastructure/prisma/prisma-patient-lookup.repository';
import { LookupPatientUseCase } from './application/lookup-patient.use-case';
import { GetEmergencyFeedUseCase } from './application/get-emergency-feed.use-case';
import { FindEmergencyFeedUseCase } from './application/find-emergency-feed.use-case';
import { UpdateStaffLocationUseCase } from './application/update-staff-location.use-case';
import { PATIENT_LOOKUP_AUDIT_PORT } from './domain/ports/patient-lookup-audit.port';
import { PrismaPatientLookupAuditAdapter } from './infrastructure/prisma/prisma-patient-lookup-audit.adapter';
import { STAFF_GEO_PORT } from './domain/ports/staff-geo.port';
import { RedisStaffGeoAdapter } from './infrastructure/redis/redis-staff-geo.adapter';
import { StaffGeoCleanupJob } from './infrastructure/redis/staff-geo-cleanup.job';

@Module({
  imports: [
    PassportModule,
    LegalModule,
    EmergencyModule,
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('STAFF_JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'STAFF_JWT_EXPIRES_IN',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [
    StaffAuthController,
    EmergencyFeedController,
    PatientLookupController,
  ],
  providers: [
    StaffAuthService,
    StaffJwtStrategy,
    // Casos de uso da aplicação (orquestram domínio e portas; sem dependência da camada HTTP)
    LookupPatientUseCase,
    GetEmergencyFeedUseCase,
    FindEmergencyFeedUseCase,
    UpdateStaffLocationUseCase,
    // Repositórios de domínio → adaptadores Prisma
    { provide: StaffRepository, useClass: PrismaStaffRepository },
    {
      provide: EmergencyFeedRepository,
      useClass: PrismaEmergencyFeedRepository,
    },
    {
      provide: PatientLookupRepository,
      useClass: PrismaPatientLookupRepository,
    },
    // Portas de saída de domínio → adaptadores de infraestrutura
    {
      provide: PATIENT_LOOKUP_AUDIT_PORT,
      useClass: PrismaPatientLookupAuditAdapter,
    },
    { provide: STAFF_GEO_PORT, useClass: RedisStaffGeoAdapter },
    StaffGeoCleanupJob,
  ],
})
export class StaffModule {}
