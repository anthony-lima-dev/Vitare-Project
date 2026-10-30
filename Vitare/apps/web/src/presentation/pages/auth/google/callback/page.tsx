/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { VitareLogo } from "../../../../components/vitare-logo";
import { useAuth } from "../../../../hooks/use-auth";
import { sessionAdapter } from "../../../../../core/infrastructure/session/session.adapter";
import { legalApi } from "../../../../../core/infrastructure/api/legal.api";
import { recordPendingGoogleSignupAcceptances } from "../../../../../core/application/auth/google-signup-acceptance";

export default function GoogleCallbackPage() {
  const { completeGoogleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  async function retryPendingAcceptance(): Promise<void> {
    const user = sessionAdapter.getProfile();
    if (!user?.id) {
      window.location.assign("/cadastro");
      return;
    }
    setIsRetrying(true);
    setError(null);
    try {
      await recordPendingGoogleSignupAcceptances(user.id, legalApi);
      const profileComplete = Boolean(
        user.cpf &&
          user.phone &&
          user.address &&
          user.birthDate &&
          user.bloodType
      );
      navigate(profileComplete ? "/dashboard" : "/completar-cadastro", { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível registrar os aceites. Tente novamente.",
      );
    } finally {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    const code = new URLSearchParams(location.search).get("code");
    if (!code) {
      setError("Não foi possível concluir a autenticação com o Google.");
      return;
    }

    void (async () => {
      try {
        await completeGoogleLogin(code);
        const user = sessionAdapter.getProfile();
        if (!user?.id)
          throw new Error("A sessão do Google não retornou um perfil válido.");
        await recordPendingGoogleSignupAcceptances(user.id, legalApi);
        // Decide where to go based on profile completeness
        const profileComplete = Boolean(
          user.cpf &&
            user.phone &&
            user.address &&
            user.birthDate &&
            user.bloodType
        );
        navigate(profileComplete ? "/dashboard" : "/completar-cadastro", { replace: true });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível concluir o cadastro com o Google. Tente novamente.",
        );
      }
    })();
  }, [completeGoogleLogin, location.search, navigate]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-sm text-center">
        <VitareLogo className="mx-auto mb-6 h-16 w-16 object-contain" />
        <h1 className="text-2xl font-bold text-gray-900">Vitare</h1>
        {error ? (
          <>
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => void retryPendingAcceptance()}
              className="mt-4 font-medium text-[#52AF7A] underline underline-offset-4 disabled:opacity-60"
            >
              {isRetrying ? "Tentando novamente..." : "Tentar novamente"}
            </button>
            <div>
              <Link
                to="/cadastro"
                className="mt-4 inline-block font-medium text-[#52AF7A] underline underline-offset-4"
              >
                Voltar ao cadastro
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Concluindo a autenticação e registrando os aceites...
          </p>
        )}
      </div>
    </div>
  );
}
