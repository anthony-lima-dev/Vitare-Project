import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../../common/decorators/public.decorator';
import { ThrottleByAccount } from '../../../../common/decorators/throttle-by-account.decorator';
import { LoginStaffDto } from './dto/login-staff.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { CheckRealmDto, CheckRealmResponseDto } from './dto/check-realm.dto';
import {
  StaffAuthService,
  CheckRealmResult,
} from '../../application/staff-auth.service';
import { StaffJwtAuthGuard } from './guards/staff-jwt-auth.guard';
import { OptionalStaffAuthGuard } from './guards/optional-staff-auth.guard';

@Controller('staff/auth')
export class StaffAuthController {
  constructor(private readonly staffAuthService: StaffAuthService) {}

  /**
   * Sessão do staff: @Public desliga o guard GLOBAL de paciente (tokens de
   * staff são assinados com STAFF_JWT_SECRET e falhariam na estratégia `jwt`);
   * a autenticação real é feita pelo StaffJwtAuthGuard abaixo.
   */
  @Public()
  @UseGuards(StaffJwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: { id: string } }) {
    return this.staffAuthService.me(req.user.id);
  }

  /** Público: apenas informa SE o bootstrap pode ocorrer (sem dados sensíveis). */
  @Public()
  @Get('setup-status')
  async getSetupStatus() {
    return this.staffAuthService.getSetupStatus();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login/check-realm')
  async checkRealm(@Body() dto: CheckRealmDto): Promise<CheckRealmResponseDto> {
    const result: CheckRealmResult = await this.staffAuthService.checkRealm(
      dto.email,
    );
    return {
      email: result.email,
      authMethod: result.authMethod,
    };
  }

  /**
   * Provisionamento controlado — NUNCA um cadastro público irrestrito:
   * sem staff cadastrado exige STAFF_BOOTSTRAP_KEY; já havendo staff,
   * exige um ADMINISTRATIVO autenticado (token opcional analisado pelo
   * OptionalStaffAuthGuard e validado pelo serviço).
   */
  @Public()
  @UseGuards(OptionalStaffAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register')
  register(
    @Body() dto: RegisterStaffDto,
    @Headers('x-bootstrap-key') bootstrapKey?: string,
    @Req() req?: Request & { user?: { id: string; role: string } },
  ) {
    return this.staffAuthService.register(
      dto.fullName,
      dto.email,
      dto.cpf,
      dto.registrationNumber,
      dto.role,
      dto.password,
      {
        bootstrapKey,
        actor: req?.user ?? undefined,
      },
      dto.legalActs ?? [],
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ThrottleByAccount({ limit: 5, ttl: 60_000 })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginStaffDto) {
    return this.staffAuthService.login(dto.email, dto.password);
  }
}
