import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RedisService } from '../../../infra/redis/redis.service';

const STAFF_ROOM = 'staff';

/**
 * Allowlist de origens do WebSocket operacional. Deve ser estado mutável em
 * nível de módulo porque as opções do decorator @WebSocketGateway são
 * avaliadas no momento da importação da classe — antes de qualquer
 * ConfigService estar disponível. O construtor do gateway popula a lista com
 * o valor de CORS_ORIGIN (mesma variável usada pelo REST, aceitando múltiplas
 * origens separadas por vírgula). Origem ausente (same-origin) é permitida.
 */
const socketCorsAllowlist = new Set<string>();

function socketCorsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  if (
    !origin ||
    socketCorsAllowlist.has('*') ||
    socketCorsAllowlist.has(origin)
  ) {
    callback(null, true);
    return;
  }
  callback(new Error('Origem não autorizada para o feed operacional'), false);
}

/**
 * Gateway WebSocket do feed operacional (adaptador de apresentação — sem
 * regras de negócio). A autenticação usa o MESMO JWT de staff dos endpoints
 * REST; conexões anônimas são rejeitadas. Eventos operacionais carregam
 * apenas identificadores estado — nenhum dado clínico é transmitido aqui.
 */
@Injectable()
@WebSocketGateway({
  cors: { origin: socketCorsOrigin, credentials: true },
  path: '/socket.io',
})
export class EmergencyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EmergencyGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private heartbeatInterval: NodeJS.Timeout | null = null;

  /** @this {void} */
  afterInit(): void {
    // Populate CORS allowlist from config (comma-separated)
    const origins =
      this.config
        .get<string>('CORS_ORIGIN')
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    origins.forEach((o) => socketCorsAllowlist.add(o));

    // Start periodic blocklist check (every 30 seconds)
    this.heartbeatInterval = setInterval(async () => {
      if (!this.server) return;
      for (const [, socket] of Array.from(this.server.sockets.sockets)) {
        const staffId = (socket.data as { staffId?: string }).staffId;
        if (staffId) {
          const blocked = await this.redis.isBlocked(staffId);
          if (blocked) {
            this.logger.warn(`Staff ${staffId} blocked, disconnecting socket`);
            socket.disconnect(true);
          }
        }
      }
    }, 30_000);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new Error('token ausente');

      // Mesma chave/contrato do staff-jwt REST; tipo explicitamente conferido.
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        type?: string;
      }>(token, { secret: this.config.get<string>('STAFF_JWT_SECRET') });

      if (payload.type !== 'staff') throw new Error('tipo de token inválido');

      // Check blocklist (revoked token)
      if (await this.redis.isBlocked(payload.sub)) {
        throw new Error('token revogado');
      }

      (client.data as { staffId?: string }).staffId = payload.sub;
      await client.join(STAFF_ROOM);
      this.logger.debug(`Staff ${payload.sub} conectado ao feed operacional`);
    } catch (error) {
      this.logger.warn(
        `Conexão WebSocket rejeitada: ${(error as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  /** @this {void} */
  handleDisconnect(client: Socket): void {
    const staffId = (client.data as { staffId?: string }).staffId;
    if (staffId) this.logger.debug(`Staff ${staffId} desconectado do feed`);
  }

  /**
   * Publica um evento operacional no room de staff. Chamado SOMENTE após
   * confirmação da persistência (Orquestrado pelo OutboxDispatcher).
   */
  publishOperationalEvent(
    type: string,
    payload: Record<string, unknown>,
  ): void {
    if (!this.server) return;
    // minimização: dados clínicos jamais são emitidos por eventos
    this.server.to(STAFF_ROOM).emit(type, payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    if (auth && typeof auth.token === 'string' && auth.token) return auth.token;

    const header = client.handshake.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.slice(7);

    return null;
  }
}
