import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, Users, Plus, User, Trash2, FileText } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@vitare/ui-components";
import { Badge } from "@vitare/ui-components";
import { Button } from "@vitare/ui-components";
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
import { useToast } from "../hooks/use-toast";

import { contactsApi } from "../../core/infrastructure/api/contacts.api";
import type { EmergencyContact } from "@vitare/core-typings";
import { AddContactDialog } from "./add-contact-dialog";

function handleCall(phone: string) {
  window.location.href = `tel:${phone.replace(/\D/g, "")}`;
}

export function EmergencyContacts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: contacts,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["emergency-contacts"],
    queryFn: async () => (await contactsApi.findAll()).data,
  });

  const { mutate: removeContact, isPending: isRemoving } = useMutation({
    mutationFn: (id: string) => contactsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast({ title: "Contato removido" });
      setPendingDeleteId(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Não foi possível remover",
        description: "Tente novamente em instantes.",
      });
      setPendingDeleteId(null);
    },
  });

  return (
    <div className="space-y-6">
      <Card className="bg-white border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#52AF7A]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[#52AF7A]" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Contatos de Emergência
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {contacts?.length ?? 0} contatos cadastrados
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="bg-[#52AF7A] hover:bg-[#458f63] text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Carregando contatos...</p>
      )}

      {isError && (
        <p className="text-red-600 text-sm">
          Não foi possível carregar os contatos de emergência.
        </p>
      )}

      {!isLoading && !isError && contacts?.length === 0 && (
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="py-10 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum contato de emergência cadastrado ainda.
            </p>
          </CardContent>
        </Card>
      )}

      {contacts && contacts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((contact: EmergencyContact) => (
            <Card
              key={contact.id}
              className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#52AF7A]/10 flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-[#52AF7A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {contact.name}
                      </h3>
                      {contact.isPrimary && (
                        <Badge className="bg-[#52AF7A] hover:bg-[#52AF7A] text-white text-xs">
                          Principal
                        </Badge>
                      )}
                    </div>
                    {contact.relationship && (
                      <p className="text-sm text-muted-foreground">
                        {contact.relationship}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {contact.phone}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleCall(contact.phone)}
                      size="icon"
                      className="bg-[#52AF7A] hover:bg-[#458f63] text-white h-10 w-10 rounded-full shadow-md"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="sr-only">Ligar para {contact.name}</span>
                    </Button>
                    <button
                      onClick={() => setPendingDeleteId(contact.id)}
                      className="text-gray-300 hover:text-red-500"
                      aria-label={`Remover ${contact.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-[#52AF7A]/5 border border-[#52AF7A]/20 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-[#52AF7A] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#52AF7A]">
                Em caso de emergência
              </p>
              <p className="text-sm text-[#52AF7A]/80">
                Ligue para o SAMU (192) ou Bombeiros (193). Os contatos acima
                serão notificados automaticamente em caso de acionamento do
                botão de emergência.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddContactDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover contato de emergência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contato será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={() => pendingDeleteId && removeContact(pendingDeleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
