import { Inject, Injectable } from '@nestjs/common';
import {
  STAFF_GEO_PORT,
  type StaffGeoPort,
} from '../domain/ports/staff-geo.port';

/**
 * Atualização de posição do profissional autenticado no índice geoespacial.
 * O identificador do membro é SEMPRE o staff do token — nunca do payload.
 */
@Injectable()
export class UpdateStaffLocationUseCase {
  constructor(
    @Inject(STAFF_GEO_PORT) private readonly geoIndex: StaffGeoPort,
  ) {}

  async execute(
    staffId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ updated: boolean; geospatialIndexAvailable: boolean }> {
    const result = await this.geoIndex.updateLocation(
      staffId,
      latitude,
      longitude,
    );
    return {
      updated: result.updated,
      geospatialIndexAvailable: result.geospatialIndexAvailable,
    };
  }
}
