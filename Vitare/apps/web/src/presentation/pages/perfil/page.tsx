/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit2,
  Save,
  X,
  Droplet,
  Ruler,
  Weight,
  Trash2,
  LogOut,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@vitare/ui-components";
import { Button } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@vitare/ui-components";
import { Badge } from "@vitare/ui-components";
import { Separator } from "@vitare/ui-components";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@vitare/ui-components";
import { AppSidebar } from "../../components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@vitare/ui-components";
import { useToast } from "../../hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@vitare/ui-components";
import { useAuth } from "../../hooks/use-auth";
import { patientsApi } from "../../../core/infrastructure/api/patients.api";
import type {
  User as UserType,
  UpdatePatientPayload,
} from "@vitare/core-typings";
import {
  BLOOD_TYPES,
  type BloodType,
} from "@vitare/core-typings";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function formatDate(value: string | null): string {
  if (!value) return "Não informado";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function UserProfilePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<UserType>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await patientsApi.getProfile()).data,
  });

  useEffect(() => {
    if (profile) setEditedData(profile);
  }, [profile]);

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: (payload: UpdatePatientPayload) =>
      patientsApi.updateProfile(payload),
    onSuccess: async (response) => {
      queryClient.setQueryData(["profile"], response.data);
      await refreshUser();
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message;
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: Array.isArray(message)
          ? message[0]
          : (message ?? "Tente novamente."),
      });
    },
  });

  const { mutate: deleteAccount, isPending: isDeleting } = useMutation({
    mutationFn: () => patientsApi.deleteAccount(),
    onSuccess: () => {
      logout();
      navigate("/login");
      toast({
        title: "Conta excluída",
        description: "Sua conta foi removida permanentemente.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Não foi possível excluir sua conta",
        description: "Tente novamente em instantes.",
      });
      setIsDeleteDialogOpen(false);
    },
  });

  function handleChange(field: keyof UserType, value: string) {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!editedData) return;

    if (
      editedData.bloodType &&
      !BLOOD_TYPES.includes(editedData.bloodType as BloodType)
    ) {
      toast({
        variant: "destructive",
        title: "Tipo sanguíneo inválido",
        description: "Selecione um dos tipos sanguíneos disponíveis.",
      });
      return;
    }

    saveProfile({
      fullName: editedData.fullName,
      phone: editedData.phone ?? undefined,
      address: editedData.address ?? null,
      birthDate: editedData.birthDate ?? undefined,
      bloodType: editedData.bloodType ?? undefined,
      weightKg: editedData.weightKg ?? undefined,
      heightCm: editedData.heightCm ?? undefined,
    });
  }

  function handleCancel() {
    if (profile) setEditedData(profile);
    setIsEditing(false);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Carregando perfil...
            </p>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (isError || !profile) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
            <p className="text-red-600 text-sm">
              Não foi possível carregar seu perfil.
            </p>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 px-4 bg-white">
          <SidebarTrigger className="-ml-1 text-gray-600" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-[#52AF7A]">
                  <Link to="/dashboard">Início</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-gray-900">
                  Meu Perfil
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen">
          <div className="max-w-3xl mx-auto space-y-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-[#52AF7A]/20">
                      <AvatarImage
                        src={profile.avatarUrl ?? undefined}
                        alt="Avatar"
                      />
                      <AvatarFallback className="bg-[#52AF7A] text-white text-2xl">
                        {getInitials(profile.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-[#52AF7A] rounded-full p-1.5">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {profile.fullName}
                    </h1>
                    <p className="text-gray-500">{profile.email}</p>
                    {profile.bloodType && (
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                        <Badge
                          variant="outline"
                          className="border-gray-200 text-gray-600"
                        >
                          Tipo Sanguíneo: {profile.bloodType}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="bg-[#52AF7A] hover:bg-[#458f63] text-white"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <User className="h-5 w-5 text-[#52AF7A]" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Seus dados pessoais e de contato
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-gray-700">
                      Nome Completo
                    </Label>
                    {isEditing ? (
                      <Input
                        id="fullName"
                        value={editedData.fullName ?? ""}
                        onChange={(e) =>
                          handleChange("fullName", e.target.value)
                        }
                        className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">
                          {profile.fullName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">
                      E-mail
                    </Label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{profile.email}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      O e-mail não pode ser alterado.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700">
                      Telefone
                    </Label>
                    {isEditing ? (
                      <Input
                        id="phone"
                        value={editedData.phone ?? ""}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">
                          {profile.phone || "Não informado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf" className="text-gray-700">
                      CPF
                    </Label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <Shield className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">
                        {profile.cpf || "Não informado"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      O CPF não pode ser alterado.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-gray-700">
                      Data de Nascimento
                    </Label>
                    {isEditing ? (
                      <Input
                        id="birthDate"
                        type="date"
                        value={editedData.birthDate?.slice(0, 10) ?? ""}
                        onChange={(e) =>
                          handleChange("birthDate", e.target.value)
                        }
                        className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">
                          {formatDate(profile.birthDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-gray-700">
                      Endereço
                    </Label>
                    {isEditing ? (
                      <Input
                        id="address"
                        value={editedData.address ?? ""}
                        onChange={(e) =>
                          handleChange("address", e.target.value)
                        }
                        className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 text-sm">
                          {profile.address || "Não informado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="border-gray-300"
                      disabled={isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isPending}
                      className="bg-[#52AF7A] hover:bg-[#458f63] text-white disabled:opacity-70"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Droplet className="h-5 w-5 text-[#52AF7A]" />
                  Dados Clínicos
                </CardTitle>
                <CardDescription>
                  Informações usadas em caso de emergência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Tipo Sanguíneo</Label>
                    {isEditing ? (
                      <Select
                        value={
                          editedData.bloodType &&
                          BLOOD_TYPES.includes(
                            editedData.bloodType as BloodType,
                          )
                            ? editedData.bloodType
                            : undefined
                        }
                        onValueChange={(value) =>
                          setEditedData((prev) => ({
                            ...prev,
                            bloodType: value as BloodType,
                          }))
                        }
                      >
                        <SelectTrigger
                          id="profile-bloodType"
                          className="w-full border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                        >
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
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <Droplet className="h-4 w-4 text-[#52AF7A]" />
                        <span className="text-gray-900">
                          {profile.bloodType || "Não informado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700">Peso (kg)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={editedData.weightKg ?? ""}
                        onChange={(e) =>
                          handleChange("weightKg", e.target.value)
                        }
                        className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <Weight className="h-4 w-4 text-[#52AF7A]" />
                        <span className="text-gray-900">
                          {profile.weightKg
                            ? `${profile.weightKg} kg`
                            : "Não informado"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700">Altura (cm)</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editedData.heightCm ?? ""}
                        onChange={(e) =>
                          handleChange("heightCm", e.target.value)
                        }
                        className="border-gray-200 focus:border-[#52AF7A] focus:ring-[#52AF7A]"
                      />
                    ) : (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                        <Ruler className="h-4 w-4 text-[#52AF7A]" />
                        <span className="text-gray-900">
                          {profile.heightCm
                            ? `${profile.heightCm} cm`
                            : "Não informado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Encerramento da sessão */}
          <Card className="border-0 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <LogOut className="h-5 w-5 text-[#52AF7A]" />
                Sessão
              </CardTitle>
              <CardDescription>
                Saia da sua conta neste dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4">
                <div>
                  <p className="font-medium text-gray-900">Sair do sistema</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Encerra sua sessão atual e retorna para a tela de login.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="shrink-0 ml-4 border-gray-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>

          {/*Exclusão de conta*/}
          <Card className="border-0 shadow-sm border-red-100 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Zona de Risco
              </CardTitle>
              <CardDescription>
                Ações irreversíveis relacionadas à sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-md border border-red-100 bg-red-50 p-4">
                <div>
                  <p className="font-medium text-gray-900">
                    Excluir minha conta
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Remove permanentemente seu perfil, condições, medicamentos,
                    contatos de emergência, alergias e histórico. Esta ação não
                    pode ser desfeita.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="bg-red-600 hover:bg-red-700 shrink-0 ml-4"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Conta
                </Button>
              </div>
            </CardContent>
          </Card>
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Excluir sua conta permanentemente?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível. Todos os seus dados — perfil,
                  condições crônicas, medicamentos, contatos de emergência,
                  alergias e histórico de acionamentos — serão apagados
                  imediatamente e não poderão ser recuperados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isDeleting}
                  onClick={() => deleteAccount()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? "Excluindo..." : "Sim, excluir minha conta"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
