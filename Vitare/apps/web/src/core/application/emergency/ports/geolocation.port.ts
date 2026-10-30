/**
 * Port para geolocalização - abstrai a API do navegador.
 * Permite injetar implementações diferentes (real, mock para testes, etc).
 */
export interface GeolocationPort {
  getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition>;
}

export interface GeolocationError extends Error {
  code: number;
  message: string;
}

export class GeolocationErrorImpl extends Error implements GeolocationError {
  public readonly code: number;
  
  constructor(code: number, message: string) {
    super(message);
    this.name = 'GeolocationError';
    this.code = code;
  }
}

export function isGeolocationError(error: unknown): error is GeolocationError {
  return error instanceof GeolocationErrorImpl;
}