import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticação opcional para staff: autentica quando o token está
 * presente e simplesmente segue sem usuário quando não está. Usado em fluxos
 * de provisionamento que podem ser bootstrap OU ação de um administrador.
 */
@Injectable()
export class OptionalStaffAuthGuard extends AuthGuard('staff-jwt') {
  override handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | null,
  ): TUser | null {
    return user ?? null;
  }
}
