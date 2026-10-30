import type {
  RegisterStaffData,
  StaffAuthPorts,
} from "../../application/auth/ports/staff-auth.port";
import type { Staff } from "@vitare/core-typings";
import { staffAuthApi } from "./staff-auth.api";

/** Adapter que consome os contratos reais de autenticação do Staff. */
export class StaffAuthApiAdapter implements StaffAuthPorts {
  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; staff: Staff }> {
    const { data } = await staffAuthApi.login({ email, password });
    return { accessToken: data.accessToken, staff: data.staff };
  }

  async register(
    data: RegisterStaffData,
  ): Promise<{ accessToken: string; staff: Staff }> {
    // `bootstrapKey` precisa seguir no cabeçalho X-Bootstrap-Key e os atos legais
    // devem seguir no corpo. O caso de uso entrega esses campos dentro de um único DTO.
    const { bootstrapKey, legalActs, ...registration } = data;
    const { data: tokenData } = await staffAuthApi.register(
      registration,
      bootstrapKey,
      legalActs,
    );
    return { accessToken: tokenData.accessToken, staff: tokenData.staff };
  }

  async me(): Promise<Staff> {
    const { data } = await staffAuthApi.me();
    return data;
  }
}

export const staffAuthApiAdapter = new StaffAuthApiAdapter();
