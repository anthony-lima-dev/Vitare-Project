/**
 * Regra PURA de domínio do fluxo de emergência: coordenadas só são válidas
 * se forem finitas e estiverem dentro da faixa geográfica WGS-84.
 * Sem dependências de navegador, React ou rede — testável isoladamente.
 */
export interface EmergencyCoordinates {
  latitude: number;
  longitude: number;
}

export function isValidEmergencyCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Extrai coordenadas de uma posição do navegador, validando-as pela regra
 * de domínio. Retorna `null` quando os valores não são utilizáveis — a
 * decisão de prosseguir sem localização é do caso de uso/presentação.
 */
export function toValidatedCoordinates(
  position: Pick<GeolocationPosition, "coords">,
): EmergencyCoordinates | null {
  const { latitude, longitude } = position.coords;
  if (!isValidEmergencyCoordinates(latitude, longitude)) return null;
  return { latitude, longitude };
}
