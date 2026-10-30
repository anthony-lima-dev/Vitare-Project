/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, User, Activity, AlertCircle, Pill } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { staffPatientsApi } from "../../core/infrastructure/api/staff-patients.api";
import type { PatientFullProfile } from "@vitare/core-typings";

const CPF_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

function formatDate(value: string | null): string {
  if (!value) return "Não informado";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9)
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}


export function StaffPatientLookup() {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientFullProfile | null>(null);

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCpf(formatCPF(e.target.value));
    };


  const { mutate: lookup, isPending } = useMutation({
    mutationFn: () => staffPatientsApi.lookupByCpf(cpf.trim()),
    onSuccess: (response) => {
      setProfile(response.data);
      setError(null);
    },
    onError: (err: any) => {
      setProfile(null);
      setError(
        err?.response?.status === 404
          ? "Nenhum paciente encontrado com este CPF."
          : "Não foi possível buscar o paciente.",
      );
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!CPF_PATTERN.test(cpf.trim())) {
      setError("Informe um CPF válido, com 11 dígitos.");
      return;
    }

    lookup();
  }

  return (
    <div className="p-6 space-y-6">
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          placeholder="000.000.000-00"
          value={cpf}
          onChange={handleCpfChange}
          className="bg-white border-gray-800 text-black"
        />
        <Button
          type="submit"
          disabled={isPending}
          className="bg-red-600 hover:bg-red-700 text-white shrink-0"
        >
          <Search className="h-4 w-4 mr-1" />
          {isPending ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {profile && (
        <Tabs defaultValue="usuario" className="w-full">
          <TabsList className="bg-gray-100 border border-gray-800">
            <TabsTrigger value="usuario">Usuário</TabsTrigger>
            <TabsTrigger value="condicoes">Doenças Crônicas</TabsTrigger>
            <TabsTrigger value="alergias">Alergias</TabsTrigger>
            <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
          </TabsList>

          {/* ── Usuário ── */}
          <TabsContent value="usuario" className="pt-4">
            <div className="rounded-lg border border-gray-800 bg-white p-6 space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-[#52AF7A]" />
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    {profile.patient.fullName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {profile.patient.email}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-gray-500">Telefone:</span>{" "}
                  <span className="text-black">
                    {profile.patient.phone ?? "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Endereço:</span>{" "}
                  <span className="text-black">
                    {profile.patient.address ?? "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Nascimento:</span>{" "}
                  <span className="text-black">
                    {formatDate(profile.patient.birthDate)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Tipo sanguíneo:</span>{" "}
                  <span className="text-black">
                    {profile.patient.bloodType ?? "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Peso:</span>{" "}
                  <span className="text-black">
                    {profile.patient.weightKg
                      ? `${profile.patient.weightKg} kg`
                      : "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Altura:</span>{" "}
                  <span className="text-black">
                    {profile.patient.heightCm
                      ? `${profile.patient.heightCm} cm`
                      : "Não informado"}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Doenças Crônicas ── */}
          <TabsContent value="condicoes" className="pt-4 space-y-3">
            {profile.conditions.length === 0 && (
              <p className="text-sm text-gray-500">
                Nenhuma condição crônica registrada.
              </p>
            )}
            {profile.conditions.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-800 bg-white p-4"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#52AF7A]" />
                  <p className="font-medium text-black">{c.name}</p>
                  <Badge
                    variant="outline"
                    className="border-gray-700 text-black text-xs font-mono"
                  >
                    {c.code}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Diagnosticado em {formatDate(c.diagnosedAt)}
                </p>
                {c.notes && (
                  <p className="text-sm text-gray-400 mt-2">{c.notes}</p>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ── Alergias ── */}
          <TabsContent value="alergias" className="pt-4 space-y-3">
            {profile.allergies.length === 0 && (
              <p className="text-sm text-gray-600">
                Nenhuma alergia registrada.
              </p>
            )}
            {profile.allergies.map((a, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-900 p-4"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p className="font-medium text-black">{a.name}</p>
                  {a.severity && (
                    <Badge
                      variant="outline"
                      className="border-red-800 text-red-400 text-xs"
                    >
                      {a.severity}
                    </Badge>
                  )}
                </div>
                {a.notes && (
                  <p className="text-sm text-gray-800 mt-2">{a.notes}</p>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ── Medicamentos ── */}
          <TabsContent value="medicamentos" className="pt-4">
            <Tabs defaultValue="permitidos">
              <TabsList className="border border-gray-800">
                <TabsTrigger value="permitidos">Permitidos</TabsTrigger>
                <TabsTrigger value="nao-permitidos">Não Permitidos</TabsTrigger>
                <TabsTrigger value="desuso">Em Desuso</TabsTrigger>
              </TabsList>

              <TabsContent value="permitidos" className="pt-4 space-y-3">
                {profile.activeMedications.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum medicamento ativo.
                  </p>
                )}
                {profile.activeMedications.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-800 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-[#52AF7A]" />
                      <div>
                        <p className="font-medium text-black">{m.name}</p>
                        <p className="text-xs text-gray-800">
                          {m.frequency} · desde {formatDate(m.startDate)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-[#52AF7A]/40 text-[#52AF7A]"
                    >
                      {m.dosage}
                    </Badge>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="nao-permitidos" className="pt-4 space-y-3">
                {profile.forbiddenMedications.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum medicamento restrito.
                  </p>
                )}
                {profile.forbiddenMedications.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg border-l-4 border-l-red-500 border-y border-r border-gray-800 p-4"
                  >
                    <p className="font-medium text-black">{m.name}</p>
                    <p className="text-xs text-gray-800">{m.laboratorio}</p>
                    <p className="text-sm text-red-400 mt-1">{m.reason}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="desuso" className="pt-4 space-y-3">
                {profile.inactiveMedications.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum medicamento em desuso.
                  </p>
                )}
                {profile.inactiveMedications.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-800 p-4 opacity-70"
                  >
                    <p className="font-medium text-gray-950">{m.name}</p>
                    <p className="text-xs text-gray-600">
                      {m.dosage} · {m.frequency} · {formatDate(m.startDate)} a{" "}
                      {formatDate(m.endDate)}
                    </p>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
