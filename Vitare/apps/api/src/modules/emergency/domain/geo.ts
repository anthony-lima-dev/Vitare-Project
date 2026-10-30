/**
 * Utilitários geográficos puros — sem Node, NestJS, Prisma ou Redis.
 * Testáveis em isolamento.
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000; // raio médio da Terra

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distância Haversine entre duas coordenadas, em metros. Custo O(1) por
 * par de pontos. Seleção de "o mais próximo entre N" é O(N) e usa o
 * índice geoespacial do Redis para filtrar candidatos.
 */
export function haversineMeters(a: GeoCoordinates, b: GeoCoordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoordinates(coords: GeoCoordinates): boolean {
  return isValidLatitude(coords.latitude) && isValidLongitude(coords.longitude);
}
