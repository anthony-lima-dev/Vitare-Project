/**
 * Projeção MÍNIMA do incidente para o feed operacional: apenas dados
 * operacionais + identidade básica do paciente. O snapshot clínico
 * NUNCA é exposto em listas (privacidade/LGPD) — é acessível somente
 * pela consulta protegida por CPF com trilha de auditoria.
 */
export interface StaffEmergencyFeedPatient {
  fullName: string;
  cpf: string | null;
}

export interface StaffEmergencyFeedItem {
  id: string;
  triggeredAt: Date;
  status: string;
  latitude: number | null;
  longitude: number | null;
  assignedStaffId: string | null;
  acceptedAt: Date | null;
  resolvedAt: Date | null;
  patient: StaffEmergencyFeedPatient;
}
