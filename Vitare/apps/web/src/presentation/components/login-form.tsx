/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { cn } from "../../../lib/utils";
import { Button } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { VitareLogo } from "./vitare-logo";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { authApi, AuthMethod, type CheckRealmResponse } from "../../core/infrastructure/api/auth.api";

// Type for login steps - internal to this component
const LoginStep = {
  IDENTIFIER: 'IDENTIFIER',
  PASSWORD: 'PASSWORD',
  REDIRECTING: 'REDIRECTING',
} as const;

type LoginStepType = typeof LoginStep[keyof typeof LoginStep];

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStepType>(LoginStep.IDENTIFIER);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingRealm, setIsCheckingRealm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const email = useWatch({ control, name: 'email' }) ?? '';

  async function onIdentifierSubmit(data: { email: string }) {
    setError(null);
    setIsCheckingRealm(true);
    try {
      const response = await authApi.checkRealm(data.email);
      const result: CheckRealmResponse = response.data;

      if (result.authMethod === AuthMethod.OAUTH_GOOGLE) {
        setStep(LoginStep.REDIRECTING);
        // Redirect to Google OAuth
        window.location.href = authApi.googleLoginUrl();
        return;
      }

      // LOCAL auth method - transition to password step
      setStep(LoginStep.PASSWORD);
      // Email is already in the form state from the first step
    } catch (err: any) {
      setError("Erro ao verificar e-mail. Tente novamente.");
    } finally {
      setIsCheckingRealm(false);
    }
  }

  async function onPasswordSubmit(data: { email: string; password: string }) {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err: any) {
      setError("E-mail ou senha inválidos");
    }
  }

  const currentSubmit = step === LoginStep.IDENTIFIER ? onIdentifierSubmit : onPasswordSubmit;
  const isLoading = isCheckingRealm || authLoading;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2">
        <VitareLogo className="h-16 w-16 object-contain" />
        <h1 className="text-2xl font-bold text-gray-900">Vitare</h1>
        <p className="text-sm text-gray-500">Sua saúde em suas mãos</p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit(currentSubmit)}>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === LoginStep.IDENTIFIER ? 'Bem-vindo de volta' : 'Digite sua senha'}
          </h2>
          <p className="text-sm text-gray-500 text-center">
            {step === LoginStep.IDENTIFIER
              ? 'Informe seu e-mail para continuar'
              : `Entrando como ${email}`}
          </p>
        </div>

        <div className="grid gap-4">
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          {step === LoginStep.IDENTIFIER && (
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  {...register('email', {
                    required: 'E-mail é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'E-mail inválido',
                    },
                  })}
                  className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A] pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          )}

          {step === LoginStep.PASSWORD && (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Mail className="h-4 w-4" />
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep(LoginStep.IDENTIFIER);
                    setValue('email', '');
                    setError(null);
                  }}
                  className="text-[#52AF7A] hover:underline ml-auto"
                >
                  Alterar e-mail
                </button>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700">
                    Senha
                  </Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-sm text-[#52AF7A] underline-offset-4 hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    {...register('password', {
                      required: 'Senha é obrigatória',
                    })}
                    className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A] pr-10"
                    disabled={isLoading}
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </>
          )}

          {step === LoginStep.REDIRECTING && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 text-[#52AF7A] animate-spin" />
              <p className="text-gray-600">Redirecionando para o Google...</p>
            </div>
          )}

          {step !== LoginStep.REDIRECTING && (
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#52AF7A] hover:bg-[#449966] text-white font-medium"
            >
              {isLoading
                ? 'Verificando...'
                : step === LoginStep.IDENTIFIER
                ? 'Continuar'
                : 'Entrar'}
            </Button>
          )}

          {step === LoginStep.PASSWORD && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Ou volte para o e-mail
                </span>
              </div>
            </div>
          )}

          {step === LoginStep.IDENTIFIER && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Ou continue com
                </span>
              </div>
            </div>
          )}

          {step === LoginStep.IDENTIFIER && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.href = authApi.googleLoginUrl();
              }}
              className="w-full border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Entrar com Google
            </Button>
          )}
        </div>

        <div className="text-center text-sm text-gray-600">
          Não tem uma conta?{" "}
          <Link
            to="/cadastro"
            className="font-medium text-[#52AF7A] hover:text-[#469968] underline underline-offset-4"
          >
            Cadastre-se
          </Link>
        </div>
      </form>
    </div>
  );
}
