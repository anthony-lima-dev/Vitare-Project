import {
  haversineMeters,
  isValidCoordinates,
  isValidLatitude,
  isValidLongitude,
} from './geo';

describe('Geo (domínio puro)', () => {
  it('distância entre um ponto e ele mesmo é zero', () => {
    expect(
      haversineMeters(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0 },
      ),
    ).toBe(0);
  });

  it('São Paulo → Rio de Janeiro ≈ 360 km (tolerância 10%)', () => {
    const sp = { latitude: -23.5505, longitude: -46.6333 };
    const rj = { latitude: -22.9068, longitude: -43.1729 };
    const meters = haversineMeters(sp, rj);
    expect(meters).toBeGreaterThan(320_000);
    expect(meters).toBeLessThan(400_000);
  });

  it('coordenadas antipodais ≈ meia circunferência terrestre', () => {
    const meters = haversineMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 180 },
    );
    expect(meters).toBeCloseTo(20_015_000, -5);
  });

  it('validação rejeita coordenadas fora de faixa', () => {
    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidCoordinates({ latitude: NaN, longitude: 0 })).toBe(false);
  });
});
