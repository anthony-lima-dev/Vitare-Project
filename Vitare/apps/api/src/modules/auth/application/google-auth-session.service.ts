import { Injectable, UnauthorizedException } from '@nestjs/common';
import { generateOpaqueToken, sha256 } from '../../../common/utils/hash.util';
import type { TokenPair } from './auth.service';

interface GoogleAuthSession {
  tokenPair: TokenPair;
  expiresAt: number;
}

@Injectable()
export class GoogleAuthSessionService {
  private readonly sessions = new Map<string, GoogleAuthSession>();
  private readonly ttlMs = 60_000;

  create(tokenPair: TokenPair): string {
    this.cleanupExpired();

    const rawCode = generateOpaqueToken();
    this.sessions.set(sha256(rawCode), {
      tokenPair,
      expiresAt: Date.now() + this.ttlMs,
    });

    return rawCode;
  }

  consume(rawCode: string): TokenPair {
    this.cleanupExpired();

    const key = sha256(rawCode);
    const session = this.sessions.get(key);

    if (!session || session.expiresAt <= Date.now()) {
      this.sessions.delete(key);
      throw new UnauthorizedException(
        'Código de autenticação Google inválido ou expirado',
      );
    }

    this.sessions.delete(key);
    return session.tokenPair;
  }

  private cleanupExpired(): void {
    const now = Date.now();

    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(key);
      }
    }
  }
}
