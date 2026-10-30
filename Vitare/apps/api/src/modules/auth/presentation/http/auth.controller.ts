/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../../../common/decorators/public.decorator';
import { ThrottleByAccount } from '../../../../common/decorators/throttle-by-account.decorator';
import {
  AuthService,
  AuthMethod,
  CheckRealmResult,
} from '../../application/auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ExchangeGoogleCodeDto } from './dto/exchange-google-code.dto';
import { CheckRealmDto, CheckRealmResponseDto } from './dto/check-realm.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { GoogleAuthSessionService } from '../../application/google-auth-session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthSession: GoogleAuthSessionService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login/check-realm')
  async checkRealm(@Body() dto: CheckRealmDto): Promise<CheckRealmResponseDto> {
    const result: CheckRealmResult = await this.authService.checkRealm(
      dto.email,
    );
    return {
      email: result.email,
      authMethod: result.authMethod,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.fullName,
      dto.email,
      dto.password,
      dto.legalActs ?? [],
    );
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ThrottleByAccount({ limit: 5, ttl: 60_000 })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Req() req: Request, @Body() _dto: LoginDto) {
    return this.authService.login(req.user as any);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  /** Logout idempotente: revoga o refresh token apresentado. */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const user = await this.authService.validateGoogleUser(req.user as any);
      const tokenPair = await this.authService.login(user);
      const code = this.googleAuthSession.create(tokenPair);
      const appUrl = this.config.get<string>('APP_URL')!.replace(/\/$/, '');

      return res.redirect(
        `${appUrl}/auth/google/callback?code=${encodeURIComponent(code)}`,
      );
    } catch {
      const appUrl = this.config.get<string>('APP_URL')!.replace(/\/$/, '');
      return res.redirect(`${appUrl}/login?googleError=authentication_failed`);
    }
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google/exchange')
  exchangeGoogleCode(@Body() dto: ExchangeGoogleCodeDto) {
    return this.googleAuthSession.consume(dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ThrottleByAccount({ limit: 3, ttl: 60_000 })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Se o e-mail existir, você receberá as instruções' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Senha redefinida com sucesso' };
  }
}
