/** Alergia declarada pelo paciente (contexto Allergies). */
export interface Allergy {
  id: string;
  userId: string;
  name: string;
  severity: string | null;
  notes: string | null;
  createdAt: Date;
}
