/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { VitareLogo } from "./vitare-logo";

import { Button } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vitare/ui-components";
import { useToast } from "../hooks/use-toast";

import { patientsApi } from "../../core/infrastructure/api/patients.api";
import { useAuth } from "../hooks/use-auth";
import { BLOOD_TYPES } from "@vitare/core-typings";
import type { BloodType } from "@vitare/core-typings";

const CPF_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const PHONE_PATTERN = /^\(\d{2}\) \d{4,5}-\d{4}$/;

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9)
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

export function CompleteRegisterForm() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bloodType, setBloodType] = useState<BloodType | "">("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  function validateProfile(): string | null {
    if (!cpf.trim()) return "Informe seu CPF";
    if (!CPF_PATTERN.test(cpf.trim())) {
      return "CPF deve conter 11 dígitos, com ou sem máscara";
    }
    if (!phone.trim()) return "Informe seu telefone";
    if (!PHONE_PATTERN.test(phone.trim())) {
      return "Telefone deve estar no formato (11) 1234-5678 ou (11) 91234-5678";
    }
    if (!address.trim()) return "Informe seu endereço";
    if (!birthDate) return "Informe sua data de nascimento";
    if (!bloodType.trim()) return "Informe seu tipo sanguíneo";
    return null;
  }

  const { mutate: saveProfile, isPending: isSavingProfile } = useMutation({
    mutationFn: () =>
      patientsApi.updateProfile({
        cpf: cpf || undefined,
        phone: phone || undefined,
        address: address || null,
        birthDate: birthDate || undefined,
        bloodType: bloodType || undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
      }),
    onSuccess: async () => {
      await refreshUser();
      toast({
        title: "Perfil salvo",
        description: "Cadastro concluído com sucesso.",
      });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (typeof status === "number" && status >= 500) {
        setProfileError(
          "Não foi possível salvar seu perfil neste momento. Verifique os dados e tente novamente. Se o problema persistir, consulte os registros da API.",
        );
        return;
      }
      setProfileError(
        Array.isArray(message)
          ? message[0]
          : (message ?? "Não foi possível salvar seus dados."),
      );
    },
  });

  function formatPhoneInput(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);

    const validationError = validateProfile();
    if (validationError) {
      setProfileError(validationError);
      return;
    }

    saveProfile();
  }

  const isFormValid =
    cpf.trim() !== "" &&
    phone.trim() !== "" &&
    address.trim() !== "" &&
    birthDate !== "" &&
    bloodType.trim() !== "";

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="flex flex-col items-center gap-2">
        <VitareLogo className="h-16 w-16 object-contain" />
        <h1 className="text-2xl font-bold text-gray-900">
          Complete seu cadastro
        </h1>
        <p className="text-sm text-gray-500 text-center">
          Essas informações ajudam socorristas em caso de emergência.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        {profileError && (
          <p className="text-sm text-red-600 text-center bg-red-50 border border-red-100 rounded-md py-2 px-3">
            {profileError}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              required
              placeholder="000.000.000-00"
              maxLength={14}
              value={cpf}
              onChange={handleCPFChange}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              required
              type="tel"
              placeholder="(11) 91234-5678"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              required
              placeholder="Rua das Flores, 123 - São Paulo, SP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input
              id="birthDate"
              required
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bloodType">Tipo sanguíneo</Label>
            <Select
              value={bloodType}
              onValueChange={(value) => setBloodType(value as BloodType)}
            >
              <SelectTrigger id="bloodType" className="w-full">
                <SelectValue placeholder="Selecione seu tipo sanguíneo" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="weightKg">Peso (kg)</Label>
            <Input
              id="weightKg"
              type="number"
              step="0.1"
              min="0"
              max="500"
              value={weightKg}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setWeightKg("");
                  return;
                }
                if (Number(val) > 500) {
                  setWeightKg("500");
                  return;
                }
                setWeightKg(val);
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="heightCm">Altura (cm)</Label>
            <Input
              id="heightCm"
              type="number"
              min="0"
              max="300"
              value={heightCm}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length > 3) return;
                if (Number(val) > 300) {
                  setHeightCm("300");
                  return;
                }
                setHeightCm(val);
              }}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSavingProfile || !isFormValid}
          className="w-full bg-[#52AF7A] hover:bg-[#469968] text-white font-medium disabled:opacity-50"
        >
          {isSavingProfile ? "Salvando..." : "Concluir cadastro"}
          {!isSavingProfile && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </form>
    </div>
  );
}
