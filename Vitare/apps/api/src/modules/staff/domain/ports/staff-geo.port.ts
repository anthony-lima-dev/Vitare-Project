/**
 * Porta do índice geoespacial de profissionais (Redis GEO).
 * O membro é SEMPRE o id do staff autenticado — nunca do payload.
 */

export interface GeoMemberWithDistance {
  id: string;
  distanceMeters: number;
}

export interface StaffGeoLocationUpdateResult {
  updated: boolean;
  /** false quando o índice não está disponível (Redis ausente). */
  geospatialIndexAvailable: boolean;
}

export interface StaffGeoPort {
  /** Registra a posição atual do profissional (com controle de frescor). */
  updateLocation(
    staffId: string,
    latitude: number,
    longitude: number,
  ): Promise<StaffGeoLocationUpdateResult>;

  /** Profissionais com posição recente dentro do raio, por distância. */
  findNearby(
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<GeoMemberWithDistance[]>;

  /** Disponibilidade do índice (política explícita de dispatch). */
  isAvailable(): boolean;
}

export const STAFF_GEO_PORT = Symbol('STAFF_GEO_PORT');
