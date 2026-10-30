import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { StaffRepository } from '../../../domain/repositories/staff.repository';

export interface StaffJwtPayload {
  sub: string;
  email: string;
  type: 'staff';
}

/**
 * Estratégia JWT de staff: além da assinatura/expiração do token, o portador
 * é REVALIDADO no banco a cada requisição. O papel (role) vem SEMPRE do
 * registro atual — tokens emitidos antes de uma alteração de papel não
 * conservam privilégios antigos, e contas removidas perdem acesso na hora.
 */
@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'staff-jwt') {
  constructor(
    config: ConfigService,
    private readonly staffRepository: StaffRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('STAFF_JWT_SECRET')!,
    });
  }

  async validate(payload: StaffJwtPayload) {
    const staff = await this.staffRepository.findById(payload.sub);
    if (!staff) {
      throw new UnauthorizedException('Credencial de staff inválida');
    }

    return {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      type: 'staff' as const,
    };
  }
}
