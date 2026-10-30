import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useStaffAuth } from "../../hooks/use-staff-auth";
import { staffAuthApi } from "../../../core/infrastructure/api/staff-auth.api";

export default function StaffEntryPage() {
  const { isAuthenticated, isInitializing } = useStaffAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitializing) return;
    if (isAuthenticated) {
      navigate("/emergencias", { replace: true });
      return;
    }

    let cancelled = false;

    staffAuthApi
      .getSetupStatus()
      .then(({ data }) => {
        if (cancelled) return;
        navigate(data.setupRequired ? "/cadastro" : "/login", { replace: true });
      })
      .catch((requestError) => {
        if (cancelled) return;

        // Some API versions do not expose setup-status. In that case the
        // public entrypoint remains usable by falling back to login, where
        // the user can explicitly access /cadastro.
        const status = isAxiosError(requestError)
          ? requestError.response?.status
          : undefined;

        if (status === 404 || status === 405) {
          navigate("/login", { replace: true });
          return;
        }

        setError(
          "Não foi possível verificar o estado do módulo de monitoramento.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitializing, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <Link
                to="/login"
                className="font-medium text-red-600 hover:text-red-700 underline underline-offset-4"
              >
                Acessar painel
              </Link>
              <Link
                to="/cadastro"
                className="font-medium text-gray-700 hover:text-gray-900 underline underline-offset-4"
              >
                Criar cadastro
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Inicializando o módulo de monitoramento...
          </p>
        )}
      </div>
    </div>
  );
}
