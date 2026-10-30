import type { GeolocationPort } from "../../application/emergency/ports/geolocation.port";

/**
 * Adapter que implementa GeolocationPort usando a API nativa do navegador.
 */
export class BrowserGeolocationAdapter implements GeolocationPort {
  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported");
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }
}

export const geolocationAdapter = new BrowserGeolocationAdapter();