import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../../infra/redis/redis.service';
import {
  GeoMemberWithDistance,
  StaffGeoLocationUpdateResult,
  StaffGeoPort,
} from '../../domain/ports/staff-geo.port';

/**
 * Índice geoespacial de profissionais em Redis (GEOADD/GEOSEARCH) com
 * controle de FRESCOR por membro: cada posição tem carimbo de tempo
 * próprio (chave TTL individual). Posições vencidas nunca são tratadas
 * como atuais — não se inventa disponibilidade.
 */
@Injectable()
export class RedisStaffGeoAdapter implements StaffGeoPort {
  private readonly logger = new Logger(RedisStaffGeoAdapter.name);
  private readonly geoKey: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const baseKey = this.config.get<string>('STAFF_GEO_KEY') ?? 'geo:staff';
    this.geoKey = this.redis.key(baseKey);
    this.ttlSeconds = Number(
      this.config.get<string>('STAFF_GEO_TTL_SECONDS') ?? '300',
    );
  }

  isAvailable(): boolean {
    return this.redis.isEnabled;
  }

  async updateLocation(
    staffId: string,
    latitude: number,
    longitude: number,
  ): Promise<StaffGeoLocationUpdateResult> {
    if (!this.redis.isEnabled) {
      return { updated: false, geospatialIndexAvailable: false };
    }

    // Validate coordinates
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      throw new Error('Coordenada inválida');
    }

    const stored = await this.redis.geoAdd(
      this.geoKey,
      staffId,
      longitude,
      latitude,
      this.ttlSeconds,
    );

    const stamped = await this.redis.setJson(
      this.freshnessKey(staffId),
      { updatedAtMs: Date.now() },
      this.ttlSeconds,
    );

    return { updated: stored && stamped, geospatialIndexAvailable: true };
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<GeoMemberWithDistance[]> {
    if (!this.redis.isEnabled) return [];

    try {
      const candidates = await this.redis.geoSearchByDistance(
        this.geoKey,
        longitude,
        latitude,
        radiusMeters,
      );

      const fresh: GeoMemberWithDistance[] = [];
      for (const candidate of candidates) {
        const stamp = await this.redis.getJson<{ updatedAtMs: number }>(
          this.freshnessKey(candidate.id),
        );
        const ageMs = Date.now() - (stamp?.updatedAtMs ?? 0);
        if (stamp && ageMs <= this.ttlSeconds * 1_000) {
          fresh.push(candidate);
        }
      }
      return fresh;
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar índice geoespacial: ${(error as Error).message}`,
      );
      return [];
    }
  }

  private freshnessKey(staffId: string): string {
    return `${this.geoKey}:updated:${staffId}`;
  }
}
