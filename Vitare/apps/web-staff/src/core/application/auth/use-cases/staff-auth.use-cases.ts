import type { Staff } from "@vitare/core-typings";
import type { StaffAuthPorts, StaffSessionPort, StaffAuthUseCases, RegisterStaffData } from "../ports/staff-auth.port";

export function createStaffAuthUseCases(
  ports: StaffAuthPorts,
  session: StaffSessionPort
): StaffAuthUseCases {
  async function persistSession(accessToken: string, staff: Staff): Promise<void> {
    session.save(accessToken, staff);
  }

  return {
    async login(email: string, password: string): Promise<Staff> {
      const { accessToken, staff } = await ports.login(email, password);
      await persistSession(accessToken, staff);
      return staff;
    },

    async register(data: RegisterStaffData): Promise<Staff> {
      const { accessToken, staff } = await ports.register(data);
      await persistSession(accessToken, staff);
      return staff;
    },

    logout(): void {
      session.clear();
    },

    async hydrateSession(): Promise<Staff | null> {
      const token = session.getAccessToken();
      if (!token) return null;

      try {
        const staff = await ports.me();
        session.saveProfile(staff);
        return staff;
      } catch {
        session.clear();
        return null;
      }
    },
  };
}