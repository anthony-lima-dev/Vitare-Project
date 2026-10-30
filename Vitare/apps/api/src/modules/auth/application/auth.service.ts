/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserAccount } from '../domain/entities/user-account.entity';
import { MAILER_PORT } from './ports/mailer.port';
import type { MailerPort } from './ports/mailer.port';
import ms from 'ms';
import {
  generateOpaqueToken,
  hashPassword,
  sha256,
  verifyPassword,
} from '../../../common/utils/hash.util';
import { AuthRepository } from '../domain/repositories/auth.repository';
import type { LegalActInput } from '../../../modules/legal/domain/entities/legal-act.entity';
import { LegalActService } from '../../../modules/legal/application/legal-act.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export enum AuthMethod {
  OAUTH_GOOGLE = 'OAUTH_GOOGLE',
  LOCAL = 'LOCAL',
}

export interface CheckRealmResult {
  email: string;
  authMethod: AuthMethod;
}

interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    private readonly config: ConfigService,
    private readonly legalActService: LegalActService,
  ) {}

  async checkRealm(email: string): Promise<CheckRealmResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.split('@')[1]?.toLowerCase();

    // Google native domains
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return { email: normalizedEmail, authMethod: AuthMethod.OAUTH_GOOGLE };
    }

    // Check if user exists and is linked to Google OAuth
    const user = await this.authRepository.findByEmail(normalizedEmail);
    if (user?.googleId) {
      return { email: normalizedEmail, authMethod: AuthMethod.OAUTH_GOOGLE };
    }

    // Security: Always return LOCAL for non-existent users or local accounts
    // to prevent user enumeration attacks (OWASP / CWE-204)
    return { email: normalizedEmail, authMethod: AuthMethod.LOCAL };
  }

  async register(
    fullName: string,
    email: string,
    password: string,
    legalActs: LegalActInput[] = [],
  ): Promise<TokenPair> {
    // O aceite de TODOS os documentos exigidos na versão vigente é
    // pré-requisito: qualquer falha ocorre ANTES de criar a conta.
    this.legalActService.validateOnboardingAcceptance(legalActs);

    const existing = await this.authRepository.findByEmail(email);
    if (existing) throw new UnauthorizedException('E-mail já cadastrado');

    const passwordHash = await hashPassword(password);
    // Conta + atos jurídicos na mesma transação (rollback se qualquer gravação falhar).
    const user = await this.authRepository.createLocalUser({
      fullName,
      email,
      passwordHash,
      legalActs,
    });

    void this.mailer.sendWelcome(user.email, user.fullName);

    return this.issueTokenPair(user);
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserAccount | null> {
    const user = await this.authRepository.findByEmail(email);
    if (!user?.passwordHash) return null;
    const isValid = await verifyPassword(password, user.passwordHash);
    return isValid ? user : null;
  }

  async login(user: UserAccount): Promise<TokenPair> {
    return this.issueTokenPair(user);
  }

  async validateGoogleUser(
    profile: GoogleProfile,
    legalActs: LegalActInput[] = [],
  ): Promise<UserAccount> {
    const existing = await this.authRepository.findByGoogleId(profile.googleId);
    if (existing) return existing;

    // Fluxo de redirecionamento do OAuth não carrega um corpo de requisição:
    // quando o aceite não é informado, a conta é criada e o aceite é coletado
    // no primeiro acesso (`/completar-cadastro`, porta de entrada do paciente).
    if (legalActs.length > 0) {
      this.legalActService.validateOnboardingAcceptance(legalActs);
    }

    return this.authRepository.createGoogleUser({
      fullName: profile.fullName,
      email: profile.email,
      googleId: profile.googleId,
      avatarUrl: profile.avatarUrl,
      legalActs,
    });
  }

  async refreshTokens(rawToken: string): Promise<TokenPair> {
    const rawSucessor = generateOpaqueToken();
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN')!;
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    // Rotação atômica e concorrentemente segura — apenas UMA requisição
    // consegue consumir o refresh token atual.
    const outcome = await this.authRepository.rotateRefreshToken(
      sha256(rawToken),
      { tokenHash: sha256(rawSucessor), expiresAt },
    );

    if (outcome.outcome === 'reused') {
      // Política de segurança: reuso de token consumido derruba a família.
      throw new UnauthorizedException(
        'Refresh token reutilizado — sessões encerradas',
      );
    }
    if (outcome.outcome !== 'rotated') {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = await this.authRepository.findById(outcome.userId);
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    return { accessToken, refreshToken: rawSucessor };
  }

  /** Logout: revoga o refresh token apresentado (idempotente). */
  async logout(rawRefreshToken: string): Promise<void> {
    await this.authRepository.revokeRefreshToken(sha256(rawRefreshToken));
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.authRepository.findByEmail(email);
    if (!user) return;

    const rawToken = generateOpaqueToken();
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    await this.mailer.sendPasswordReset(user.email, rawToken);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);

    // Consumo do token + troca de senha + revogação de sessões na MESMA
    // transação; nenhuma das três escritas acontece sem as outras.
    const outcome =
      await this.authRepository.consumePasswordResetAndRotateCredentials(
        sha256(rawToken),
        passwordHash,
      );

    if (outcome.outcome !== 'consumed') {
      throw new UnauthorizedException(
        'Link inválido, já utilizado ou expirado',
      );
    }
  }

  private async issueTokenPair(user: UserAccount): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const rawRefreshToken = generateOpaqueToken();
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN')!;
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    await this.authRepository.storeRefreshToken({
      userId: user.id,
      tokenHash: sha256(rawRefreshToken),
      expiresAt,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }
}
