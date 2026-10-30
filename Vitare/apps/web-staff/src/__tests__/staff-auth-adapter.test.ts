import { beforeEach, describe, expect, it, vi } from "vitest";
import { staffAuthApi } from "../core/infrastructure/api/staff-auth.api";
import { StaffAuthApiAdapter } from "../core/infrastructure/api/staff-auth.adapter";

vi.mock("../core/infrastructure/api/staff-auth.api", () => ({
  staffAuthApi: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
}));

const staff = {
  id: "staff-1", fullName: "Responder", email: "responder@example.com", cpf: "12345678901",
  registrationNumber: "CRM/SP 123", role: "MEDICO_SOCORRISTA",
};

const adapter = new StaffAuthApiAdapter();

describe("StaffAuthApiAdapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the staff profile included in the login response without a second /me request", async () => {
    vi.mocked(staffAuthApi.login).mockResolvedValue({ data: { accessToken: "fresh-token", staff } } as never);
    await expect(adapter.login(staff.email, "password")).resolves.toEqual({ accessToken: "fresh-token", staff });
    expect(staffAuthApi.me).not.toHaveBeenCalled();
  });

  it("forwards bootstrap key as a separate header argument and preserves legal acceptances", async () => {
    const legalActs = [
      { actType: "TERMS_OF_USE", documentVersion: "v1", contentHash: "sha256:terms" },
      { actType: "PRIVACY_NOTICE", documentVersion: "v1", contentHash: "sha256:privacy" },
    ] as never;
    vi.mocked(staffAuthApi.register).mockResolvedValue({ data: { accessToken: "fresh-token", staff } } as never);

    await expect(adapter.register({
      fullName: staff.fullName,
      email: staff.email,
      cpf: staff.cpf,
      registrationNumber: staff.registrationNumber,
      role: staff.role,
      password: "password",
      bootstrapKey: "test-bootstrap-key",
      legalActs,
    })).resolves.toEqual({ accessToken: "fresh-token", staff });

    expect(staffAuthApi.register).toHaveBeenCalledWith({
      fullName: staff.fullName,
      email: staff.email,
      cpf: staff.cpf,
      registrationNumber: staff.registrationNumber,
      role: staff.role,
      password: "password",
    }, "test-bootstrap-key", legalActs);
    expect(staffAuthApi.me).not.toHaveBeenCalled();
  });
});
