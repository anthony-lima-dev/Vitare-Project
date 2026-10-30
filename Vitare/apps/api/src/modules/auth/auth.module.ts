import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EmailModule } from '../../infra/email/email.module';
import { LegalModule } from '../legal/legal.module';
import { AuthController } from './presentation/http/auth.controller';
import { GoogleAuthSessionService } from './application/google-auth-session.service';
import { AuthService } from './application/auth.service';
import { GoogleStrategy } from './presentation/http/strategies/google.strategy';
import { JwtStrategy } from './presentation/http/strategies/jwt.strategy';
import { LocalStrategy } from './presentation/http/strategies/local.strategy';
import { AuthRepository } from './domain/repositories/auth.repository';
import { PrismaAuthRepository } from './infrastructure/prisma/prisma-auth.repository';
import { MAILER_PORT } from './application/ports/mailer.port';
import { SmtpMailerAdapter } from './infrastructure/smtp-mailer.adapter';

@Module({
  imports: [
    PassportModule,
    EmailModule,
    LegalModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleAuthSessionService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    { provide: AuthRepository, useClass: PrismaAuthRepository },
    { provide: MAILER_PORT, useClass: SmtpMailerAdapter },
  ],
  exports: [AuthService],
})
export class AuthModule {}
