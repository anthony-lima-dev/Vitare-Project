import { User, Droplets, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@vitare/ui-components";
import { useAuth } from "../hooks/use-auth";
import { allergiesApi } from "../../core/infrastructure/api/allergies.api";

export function UserInfoCards() {
  const { user } = useAuth();

  const { data: allergies, isLoading: isLoadingAllergies } = useQuery({
    queryKey: ["allergies"],
    queryFn: async () => (await allergiesApi.findAll()).data,
    refetchOnMount: "always",
  });

  return (
    <div className="grid gap-1 grid-cols-1 sm:grid-cols-1 lg:grid-cols-3">
      {/* Name Card */}
      <Card className="bg-white border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Nome
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-[#52AF7A]/10 flex items-center justify-center">
            <User className="h-4 w-4 text-[#52AF7A]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {user?.fullName ?? "..."}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Paciente registrado
          </p>
        </CardContent>
      </Card>

      {/* Blood Type Card */}
      <Card className="bg-white border-0 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tipo Sanguíneo
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
            <Droplets className="h-4 w-4 text-red-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {user?.bloodType ?? "Não informado"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {user?.bloodType ? "Cadastrado no perfil" : "Complete seu perfil"}
          </p>
        </CardContent>
      </Card>

      {/* Allergies Card */}
      <Card className="bg-white border-0 shadow-md sm:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Alergias
          </CardTitle>
          <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAllergies && (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          )}

          {!isLoadingAllergies && allergies && allergies.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nenhuma alergia registrada
            </p>
          )}

          {allergies && allergies.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {allergies.map((allergy) => (
                  <span
                    key={allergy.id}
                    className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200"
                  >
                    {allergy.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {allergies.length}{" "}
                {allergies.length === 1
                  ? "alergia registrada"
                  : "alergias registradas"}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
