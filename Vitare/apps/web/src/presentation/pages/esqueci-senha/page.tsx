/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { VitareLogo } from "../../components/vitare-logo";
import { authApi } from "../../../core/infrastructure/api/auth.api";
import { Button } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSuccess(true);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message[0]
          : (message ??
              "Não foi possível processar a solicitação. Tente novamente."),
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
            <p className="text-sm text-gray-500">Recuperação de acesso</p>
          </div>

          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Esqueceu sua senha?
            </h2>
            <p className="text-sm text-gray-500">
              Informe o e-mail da sua conta e enviaremos as instruções para
              criar uma nova senha.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col gap-4 rounded-md border border-[#52AF7A]/30 bg-[#52AF7A]/10 p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#52AF7A]">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  Solicitação enviada
                </p>
                <p className="text-sm text-gray-600">
                  Se o e-mail informado estiver cadastrado, você receberá um
                  link para redefinir sua senha. Verifique também a caixa de
                  spam.
                </p>
              </div>
              <Link
                to="/login"
                className="font-medium text-[#52AF7A] underline underline-offset-4"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {error && (
                <p className="text-center text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-700">
                  E-mail
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#52AF7A] font-medium text-white hover:bg-[#449966]"
              >
                {isSubmitting ? "Enviando..." : "Enviar instruções"}
              </Button>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
