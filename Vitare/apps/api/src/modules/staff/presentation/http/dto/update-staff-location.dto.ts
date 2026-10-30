import { IsLatitude, IsLongitude } from 'class-validator';

export class UpdateStaffLocationDto {
  @IsLatitude({ message: 'Latitude deve estar no intervalo [-90, 90].' })
  latitude!: number;

  @IsLongitude({ message: 'Longitude deve estar no intervalo [-180, 180].' })
  longitude!: number;
}
