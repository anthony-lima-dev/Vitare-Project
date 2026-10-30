import { Test, TestingModule } from '@nestjs/testing';
import { RedisStaffGeoAdapter } from './redis-staff-geo.adapter';
import { RedisService } from '../../../../infra/redis/redis.service';
import { ConfigService } from '@nestjs/config';

describe('RedisStaffGeoAdapter', () => {
  let adapter: RedisStaffGeoAdapter;
  let redisMock: Partial<RedisService>;

  beforeEach(async () => {
    redisMock = {
      isEnabled: true,
      geoAdd: jest.fn().mockResolvedValue(true),
      setJson: jest.fn().mockResolvedValue(true),
      key: (base: string) => `vitare:local:${base}`,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisStaffGeoAdapter,
        { provide: RedisService, useValue: redisMock },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              k === 'STAFF_GEO_KEY'
                ? 'geo:staff'
                : k === 'STAFF_GEO_TTL_SECONDS'
                  ? '300'
                  : null,
          },
        },
      ],
    }).compile();

    adapter = module.get(RedisStaffGeoAdapter);
  });

  it('should reject latitude out of range', async () => {
    await expect(adapter.updateLocation('staff-1', 100, 0)).rejects.toThrow(
      'Coordenada inválida',
    );
  });

  it('should reject longitude out of range', async () => {
    await expect(adapter.updateLocation('staff-1', 0, 200)).rejects.toThrow(
      'Coordenada inválida',
    );
  });

  it('should reject (0,0) as invalid', async () => {
    await expect(adapter.updateLocation('staff-1', 0, 0)).rejects.toThrow(
      'Coordenada inválida',
    );
  });

  it('should accept valid coordinates', async () => {
    const result = await adapter.updateLocation('staff-1', -23.55, -46.63);
    expect(result.updated).toBe(true);
    expect(redisMock.geoAdd).toHaveBeenCalled();
  });
});
