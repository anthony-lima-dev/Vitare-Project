/** Contato de emergência do paciente (contexto Contacts). */
export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string | null;
  isPrimary: boolean;
  createdAt: Date;
}
