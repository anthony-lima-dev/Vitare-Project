export type GeolocationFailureCode = 1 | 2 | 3 | "UNSUPPORTED" | "UNKNOWN";

export class GeolocationError extends Error {
  readonly code: GeolocationFailureCode;

  constructor(code: GeolocationFailureCode, message: string) {
    super(message);
    this.name = "GeolocationError";
    this.code = code;
  }
}

interface GeolocationOptions {
  timeoutMs?: number;
  maximumAgeMs?: number;
}

/**
 * Obtém uma posição atual do navegador sem esconder falhas de geolocalização.
 * A posição retornada pode ser aproximada; a API do navegador também informa
 * a precisão em position.coords.accuracy para quem precisar auditá-la.
 */
export function getCurrentLocation({
  timeoutMs = 15_000,
  maximumAgeMs = 0,
}: GeolocationOptions = {}): Promise<GeolocationPosition> {
  if (!navigator.geolocation) {
    return Promise.reject(
      new GeolocationError(
        "UNSUPPORTED",
        "Este navegador não oferece suporte à geolocalização.",
      ),
    );
  }

  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        const code: GeolocationFailureCode =
          error.code === 1 || error.code === 2 || error.code === 3
            ? error.code
            : "UNKNOWN";

        let message: string;
        switch (code) {
          case 1:
            message = "A permissão de localização foi negada.";
            break;
          case 2:
            message =
              "O navegador não conseguiu determinar a localização deste dispositivo.";
            break;
          case 3:
            message = "A obtenção da localização excedeu o tempo limite.";
            break;
          default:
            message = "Não foi possível obter a localização do dispositivo.";
        }

        reject(new GeolocationError(code, message));
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      },
    );
  });
}
