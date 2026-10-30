/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useStaffAuth } from "../hooks/use-staff-auth";
import { VitareLogo } from "./vitare-logo";

export function StaffLoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login, isLoading } = useStaffAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Informe sua senha.");
      return;
    }

    try {
      await login(email.trim().toLowerCase(), password);
      navigate("/emergencias");
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message[0]
          : (message ?? "E-mail ou senha inválidos. Tente novamente."),
      );
    }
  }

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md flex flex-col gap-6 py-6 px-4",
        className,
      )}
      {...props}
    >
      {/* Cabeçalho principal */}
      <div className="flex flex-col items-center gap-2">
        <VitareLogo className="h-16 w-16 object-contain" />
        <h1 className="text-2xl font-bold text-gray-900">Vitare</h1>
        <p className="text-sm text-gray-500">Módulo de Monitoramento</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          {/* Subtítulo do Acesso */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Acesso Restrito
            </h2>
            <p className="text-sm text-gray-500">
              Painel de monitoramento para equipe de resposta
            </p>
          </div>

          <div className="grid gap-4">
            {error && (
              <p className="text-sm text-red-600 text-center bg-red-50 border border-red-100 rounded-md py-2 px-3">
                {error}
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-700">
                E-mail institucional
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="socorrista@samu.gov.br"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-300 focus:border-red-600 focus:ring-red-600"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-gray-700">
                Senha de acesso
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-300 focus:border-red-600 focus:ring-red-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium mt-2"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Ainda não tem cadastro?{" "}
            <Link
              to="/cadastro"
              className="font-medium text-red-600 hover:text-red-700 underline underline-offset-4"
            >
              Criar cadastro
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
