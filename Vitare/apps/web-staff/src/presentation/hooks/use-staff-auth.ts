import { useContext } from "react";
import { StaffAuthContext } from "../../core/application/auth/ports/staff-auth.port";

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx)
    throw new Error("useStaffAuth deve ser usado dentro de StaffAuthProvider");
  return ctx;
}
