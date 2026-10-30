// components/emergency-fab.tsx
import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ShimmerButton } from "@vitare/ui-components";
import { useAuth } from "../hooks/use-auth";
import {
  triggerEmergency,
  type TriggerEmergencyOutcome,
} from "../../core/application/emergency/use-cases/trigger-emergency";
import { geolocationAdapter } from "../../core/infrastructure/api/geolocation.adapter";
import { outboxAdapter } from "../../core/infrastructure/offline/outbox.adapter";
import { cn } from "../../../lib/utils";
import { toast } from "../hooks/use-toast";

interface EmergencyFabProps {
  size?: "default" | "lg";
}

const SIZE_CLASSES = {
  default: "h-20 w-20",
  lg: "h-28 w-28",
};

const ICON_SIZE_CLASSES = {
  default: "h-6 w-6",
  lg: "h-10 w-10",
};

export function EmergencyFab({ size = "default" }: EmergencyFabProps) {
  const [isTriggering, setIsTriggering] = useState(false);
  const { user } = useAuth();
  // Guarda o id da operação em andamento para que cliques repetidos
  // (ou re-renders) NUNCA criem uma segunda operação lógica.
  const inFlightOperation = useRef<string | null>(null);

  // Ao (re)conectar, tenta enviar o que ainda estiver pendente para ESTA
  // identidade. A confirmação real vem apenas da resposta do servidor.
  useEffect(() => {
    if (!user) return;

    const flush = () => {
      void outboxAdapter.syncEmergencyOutbox(user.id);
    };

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [user]);

  function presentOutcome(result: TriggerEmergencyOutcome) {
    switch (result.outcome) {
      case "pending-offline":
        toast({
          title: "Emergência aguardando envio",
          description:
            "O acionamento foi guardado no dispositivo e será enviado automaticamente assim que a conexão voltar.",
        });
        break;
      case "triggered":
        toast({
          title: "Emergência acionada",
          description: result.withLocation
            ? "Sua localização foi enviada para a equipe de atendimento."
            : "A emergência foi enviada, mas a localização não estava disponível.",
        });

        window.location.href = "tel:192";
        break;
      case "cancelled-by-user":
        toast({
          title: "Emergência não acionada",
          description:
            "A localização não foi obtida e o acionamento foi cancelado.",
          variant: "destructive",
        });
        break;
      case "failed":
        console.error("Falha ao acionar emergência:", result.reason);
        toast({
          title: "Falha ao acionar emergência",
          description:
            "Não foi possível registrar o acionamento. Tente novamente ou ligue para 192 diretamente.",
          variant: "destructive",
        });
        break;
    }
  }

  async function handleTrigger() {
    if (isTriggering || inFlightOperation.current) return;
    if (!user) {
      toast({
        title: "Sessão expirada",
        description: "Entre novamente para acionar a emergência.",
        variant: "destructive",
      });
      return;
    }

    setIsTriggering(true);
    inFlightOperation.current = "in-flight";
    try {
      const result = await triggerEmergency(user.id, {
        confirmContinueWithoutLocation: (message) =>
          window.confirm(
            `${message}\n\n` +
              "A emergência pode ser acionada mesmo sem coordenadas, mas o mapa não ficará disponível para a equipe de atendimento.\n\n" +
              "Deseja continuar com a emergência?",
          ),
        geolocation: geolocationAdapter,
        outbox: outboxAdapter,
      });
      presentOutcome(result);
    } finally {
      inFlightOperation.current = null;
      setIsTriggering(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <ShimmerButton
        background="#A20202"
        shimmerColor="#ff6b6b"
        borderRadius="100%"
        shimmerDuration="2s"
        className={cn(
          SIZE_CLASSES[size],
          "p-0 shadow-lg hover:shadow-xl transition-shadow disabled:opacity-60",
        )}
        aria-label="Emergência"
        onClick={handleTrigger}
        disabled={isTriggering}
      >
        <AlertTriangle className={ICON_SIZE_CLASSES[size]} />
      </ShimmerButton>
    </div>
  );
}
