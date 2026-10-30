import { Navigate } from "react-router-dom";
import { useStaffAuth } from "../hooks/use-staff-auth";

export function StaffProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitializing } = useStaffAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-gray-500">Validando sessão de monitoramento...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
