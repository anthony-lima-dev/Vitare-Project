/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { VitareLogo } from "../../../components/vitare-logo";
import { authApi } from "../../../../core/infrastructure/api/auth.api";
import { Button } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import { isPasswordPolicySatisfied } from "../../../../core/application/auth/password-policy";

export default function ResetPasswordPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "O link de redefinição não contém um token válido.",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("O link de redefinição é inválido ou está incompleto.");
      return;
    }

    if (!isPasswordPolicySatisfied(password)) {
      setError(
        "A senha deve ter no mínimo 8 caracteres, até 72 bytes UTF-8 e atender a pelo menos 2 dos critérios de complexidade (minúscula, maiúscula, número e caractere especial).",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message[0]
          : (message ??
              "Não foi possível redefinir sua senha. O link pode estar inválido ou expirado."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-white p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <VitareLogo className="h-16 w-16 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">Vitare</h1>
            <p className="text-sm text-gray-500">Redefinição de senha</p>
          </div>

          {success ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#52AF7A]">
                <LockKeyhole className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  Senha redefinida
                </h2>
                <p className="text-sm text-gray-500">
                  Sua nova senha foi salva com sucesso. Entre novamente no
                  Vitare usando suas novas credenciais.
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 font-medium text-[#52AF7A] underline underline-offset-4"
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Crie uma nova senha
                </h2>
                <p className="text-sm text-gray-500">
                  Defina uma nova senha para acessar sua conta.
                </p>
              </div>

              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                {error && (
                  <p className="text-center text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-gray-700">
                    Nova senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="border-gray-200 pr-10 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use pelo menos 8 caracteres, com maiúscula, minúscula,
                    número e caractere especial.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700">
                    Confirmar nova senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="border-gray-200 pr-10 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={
                        showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !token}
                  className="w-full bg-[#52AF7A] font-medium text-white hover:bg-[#449966]"
                >
                  {isSubmitting ? "Salvando..." : "Redefinir senha"}
                </Button>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
