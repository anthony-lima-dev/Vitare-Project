/**
 * Contrato legado mantido por compatibilidade com componentes que já o usam.
 * Novos consumidores devem usar os ports em `../application/ports/*`.
 */
import { PatientSnapshot } from '../clinical-snapshot';

export type { PatientSnapshot };

export interface EmergencyTriggerData {
  userId: string;
  latitude?: number;
  longitude?: number;
}
