/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "@vitare/ui-components";
import { Checkbox } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import { useStaffAuth } from "../hooks/use-staff-auth";
import { VitareLogo } from "./vitare-logo";
import { REQUIRED_LEGAL_DOCUMENTS } from "@vitare/core-typings";
import type { LegalActAcceptance } from "@vitare/core-typings";
import { isPasswordPolicySatisfied } from "../../core/application/auth/password-policy";

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9)
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

export function StaffSignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { register, isLoading } = useStaffAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [role, setRole] = useState("MEDICO_SOCORRISTA");
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const rawCpf = cpf.replace(/\D/g, "");
    if (rawCpf.length !== 11) {
      setError("Informe um CPF válido com 11 dígitos.");
      return;
    }

    if (!registrationNumber.trim()) {
      setError("Informe o número do seu registro profissional.");
      return;
    }

    if (!isPasswordPolicySatisfied(password)) {
      setError(
        "A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra minúscula, uma letra maiúscula, um número ou um caractere especial.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError(
        "É necessário aceitar os Termos de Uso e o Aviso de Privacidade para criar a credencial.",
      );
      return;
    }

    const legalActs: LegalActAcceptance[] = REQUIRED_LEGAL_DOCUMENTS.map(
      (doc) => ({
        actType: doc.actType,
        documentVersion: doc.version,
        contentHash: doc.contentHash,
      }),
    );

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        cpf: rawCpf,
        registrationNumber: registrationNumber.trim(),
        role,
        password,
        bootstrapKey: bootstrapKey.trim() || undefined,
        legalActs,
      });

      navigate("/emergencias");
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message[0]
          : (message ??
              "Não foi possível cadastrar a credencial de staff. Tente novamente."),
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
      {/* Cabeçalho do Vitare */}
      <div className="flex flex-col items-center gap-2">
        <VitareLogo className="h-16 w-16 object-contain" />
        <h1 className="text-2xl font-bold text-gray-900">Vitare</h1>
        <p className="text-sm text-gray-500">Módulo de Monitoramento</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          {/* Subtítulo da Ação */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Criar conta de Staff
            </h2>
            <p className="text-sm text-gray-500">
              Preencha suas informações para criar sua credencial
            </p>
          </div>

          <div className="grid gap-4">
            {error && (
              <p className="text-sm text-red-600 text-center bg-red-50 border border-red-100 rounded-md py-2 px-3">
                {error}
              </p>
            )}

            <div className="grid gap-2">
              <Label htmlFor="fullName" className="text-gray-700">
                Nome completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Dr(a). Carlos Silva"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-gray-300 focus:border-red-600 focus:ring-red-600"
              />
            </div>

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
              <Label htmlFor="cpf" className="text-gray-700">
                CPF
              </Label>
              <Input
                id="cpf"
                type="text"
                required
                maxLength={14}
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="border-gray-300 focus:border-red-600 focus:ring-red-600"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="registrationNumber" className="text-gray-700">
                Registro Profissional (CRM/COREN)
              </Label>
              <Input
                id="registrationNumber"
                type="text"
                placeholder="CRM/SP 123456"
                required
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="border-gray-300 focus:border-red-600 focus:ring-red-600"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role" className="text-gray-700">
                Função / Cargo
              </Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
              >
                <option value="MEDICO_SOCORRISTA">Médico(a) Socorrista</option>
                <option value="ENFERMEIRO_SOCORRISTA">
                  Enfermeiro(a) Socorrista
                </option>
                <option value="TECNICO_ENFERMAGEM">
                  Técnico(a) de Enfermagem
                </option>
                <option value="OPERADOR_TACTICAL">
                  Operador Tático / TARM
                </option>
                <option value="ADMINISTRATIVO">Administrativo</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bootstrapKey" className="text-gray-700">
                Chave de ativação do sistema
              </Label>
              <Input
                id="bootstrapKey"
                type="password"
                value={bootstrapKey}
                onChange={(e) => setBootstrapKey(e.target.value)}
                placeholder="Obrigatória apenas no primeiro cadastro"
                className="border-gray-300 focus:border-red-600 focus:ring-red-600"
              />
              <p className="text-xs text-gray-500">
                O cadastro de profissionais exige autorização: use a chave de
                provisionamento do ambiente (primeiro acesso) ou peça a um
                administrador já cadastrado.
              </p>
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
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-300 focus:border-red-600 focus:ring-red-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                Mínimo de 8 caracteres, com pelo menos uma
                letra minúscula, uma letra maiúscula, um número ou um caractere
                especial.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-gray-700">
                Confirmar senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border-gray-300 focus:border-red-600 focus:ring-red-600 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

            <div className="grid gap-2">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) =>
                    setAcceptedTerms(
                      checked !== false && checked !== "indeterminate",
                    )
                  }
                />
                <div className="text-sm leading-none">
                  <Label className="font-semibold" htmlFor="terms">
                    Concordo com os {REQUIRED_LEGAL_DOCUMENTS[0].title} (v
                    {REQUIRED_LEGAL_DOCUMENTS[0].version})
                  </Label>
                  <p className="text-xs text-gray-500">
                    Obrigatório para criar a credencial (versão{" "}
                    {REQUIRED_LEGAL_DOCUMENTS[0].version}).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) =>
                    setAcceptedPrivacy(
                      checked !== false && checked !== "indeterminate",
                    )
                  }
                />
                <div className="text-sm leading-none">
                  <Label className="font-semibold" htmlFor="privacy">
                    Concordo com o {REQUIRED_LEGAL_DOCUMENTS[1].title} (v
                    {REQUIRED_LEGAL_DOCUMENTS[1].version})
                  </Label>
                  <p className="text-xs text-gray-500">
                    Obrigatório para criar a credencial (versão{" "}
                    {REQUIRED_LEGAL_DOCUMENTS[1].version}).
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium mt-2"
            >
              {isLoading ? "Cadastrando..." : "Cadastrar Credenciais"}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Já possui acesso?{" "}
            <Link
              to="/login"
              className="font-medium text-red-600 hover:text-red-700 underline underline-offset-4"
            >
              Entrar
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
