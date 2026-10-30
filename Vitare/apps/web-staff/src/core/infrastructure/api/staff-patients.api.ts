import { staffApiClient } from "./staff-client.api";
import type { PatientFullProfile } from "@vitare/core-typings";

export const staffPatientsApi = {
  lookupByCpf: (cpf: string) =>
    staffApiClient.get<PatientFullProfile>("/staff/patients", {
      params: { cpf },
    }),
};
