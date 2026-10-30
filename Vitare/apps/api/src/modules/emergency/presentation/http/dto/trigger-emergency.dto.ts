import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
} from 'class-validator';

export class TriggerEmergencyDto {
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  /**
   * Snapshot clínico capturado offline pelo PWA. Quando presente, o servidor
   * marca a proveniência como "client" e NÃO o apresenta como dado validado
   * pelo backend. Campos ausentes no contrato são ignorados.
   */
  @IsOptional()
  @IsObject()
  patientSnapshot?: Record<string, unknown>;

  /** Horário informado pelo dispositivo no acionamento offline. */
  @IsOptional()
  @IsDateString()
  clientTriggeredAt?: string;
}
