import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  MapPin,
  MapPinOff,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { LocationMap } from "./location-map";
import { staffEmergenciesApi } from "../../core/infrastructure/api/staff-emergencies.api";
import { connectStaffSocket } from "../../core/infrastructure/realtime/emergency-socket";
import type { EmergencyFeedItem } from "@vitare/core-typings";
import { toast } from "sonner";

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("pt-BR");
}

function formatCpf(value: string | null | undefined): string {
  if (!value) return "CPF não informado";

  const digits = value.replace(/\\D/g, "");
  if (digits.length !== 11) return value;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function getStatusBadge(status: EmergencyFeedItem["status"]) {
  switch (status) {
    case "TRIGGERED":
      return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">ACIONADO</Badge>;
    case "NOTIFIED":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">NOTIFICADO</Badge>;
    case "ACCEPTED":
      return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">ACEITO</Badge>;
    case "RESOLVED":
      return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">ENCERRADO</Badge>;
  }
}

export function StaffEmergenciesFeed() {
  const queryClient = useQueryClient();
  const {
    data: events,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["staff-emergencies"],
    queryFn: async () => (await staffEmergenciesApi.findRecent(50)).data,
    refetchInterval: 15_000,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => staffEmergenciesApi.accept(id),
    onSuccess: () => {
      toast.success("Chamado aceito");
      void queryClient.invalidateQueries({ queryKey: ["staff-emergencies"] });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message ?? "Não foi possível aceitar o chamado");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => staffEmergenciesApi.resolve(id),
    onSuccess: () => {
      toast.success("Chamado encerrado");
      void queryClient.invalidateQueries({ queryKey: ["staff-emergencies"] });
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message ?? "Não foi possível encerrar o chamado");
    },
  });

  // Real-time updates via socket
  useEffect(
    () =>
      connectStaffSocket(() => {
        void queryClient.invalidateQueries({ queryKey: ["staff-emergencies"] });
      }),
    [queryClient],
  );

  if (isLoading)
    return <p className="text-gray-500 text-sm p-6">Carregando chamados...</p>;
  if (isError)
    return (
      <p className="text-red-600 text-sm p-6">
        Não foi possível carregar o feed de emergências.
      </p>
    );

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <AlertTriangle className="h-10 w-10 mb-3 opacity-40 text-gray-400" />
        <p className="text-sm font-medium text-gray-500">
          Nenhum chamado de emergência registrado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 max-w-5xl mx-auto">
      {events.map((event: EmergencyFeedItem) => {
        const canAccept = event.status === "TRIGGERED" || event.status === "NOTIFIED";
        const canResolve = event.status === "ACCEPTED";

        return (
          <Card key={event.id} className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MapPin className="h-4 w-4 text-red-600 shrink-0" />
                    <p className="font-semibold text-gray-900 truncate">
                      {event.patient.fullName}
                    </p>
                    <Badge variant="outline" className="text-xs font-mono">
                      {formatCpf(event.patient.cpf)}
                    </Badge>
                    {getStatusBadge(event.status)}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTimestamp(event.triggeredAt)}
                    </span>
                    {event.latitude && event.longitude && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                      </span>
                    )}
                    {event.assignedStaffId && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <MapPinOff className="h-3.5 w-3.5" />
                        Atribuído
                      </span>
                    )}
                  </div>

                  {event.acceptedAt && (
                    <p className="mt-1 text-xs text-gray-500">
                      Aceito em: {formatTimestamp(event.acceptedAt)}
                    </p>
                  )}
                  {event.resolvedAt && (
                    <p className="mt-1 text-xs text-gray-500">
                      Encerrado em: {formatTimestamp(event.resolvedAt)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canAccept && (
                    <button
                      onClick={() => void acceptMutation.mutate(event.id)}
                      disabled={acceptMutation.isPending}
                      className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {acceptMutation.isPending ? "Aceitando..." : "Aceitar"}
                    </button>
                  )}
                  {canResolve && (
                    <button
                      onClick={() => void resolveMutation.mutate(event.id)}
                      disabled={resolveMutation.isPending}
                      className="rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {resolveMutation.isPending ? "Encerrando..." : "Encerrar"}
                    </button>
                  )}
                </div>
              </div>

              {event.latitude && event.longitude && (
                <div className="mt-4">
                  <LocationMap
                    latitude={event.latitude}
                    longitude={event.longitude}
                    patientName={event.patient.fullName}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
