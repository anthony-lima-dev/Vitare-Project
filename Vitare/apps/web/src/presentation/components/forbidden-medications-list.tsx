import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Plus, Trash2, FileText } from "lucide-react";

import { Card, CardContent } from "@vitare/ui-components";
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

import { forbiddenMedicationsApi } from "../../core/infrastructure/api/forbidden-medications.api";
import type { ForbiddenMedication } from "@vitare/core-typings";
import { AddForbiddenMedicationDialog } from "./add-forbidden-medication-dialog";

export function ForbiddenMedicationsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: forbiddenMedications,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["forbidden-medications"],
    queryFn: async () => (await forbiddenMedicationsApi.findAll()).data,
  });

  const { mutate: removeForbidden, isPending: isRemoving } = useMutation({
    mutationFn: (id: string) => forbiddenMedicationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forbidden-medications"] });
      toast({ title: "Restrição removida" });
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {forbiddenMedications?.length ?? 0} medicamentos restritos
        </p>
        <Button
          size="sm"
          onClick={() => setIsDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      )}

      {isError && (
        <p className="text-red-600 text-sm">
          Não foi possível carregar os medicamentos restritos.
        </p>
      )}

      {!isLoading && !isError && forbiddenMedications?.length === 0 && (
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="py-10 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum medicamento restrito cadastrado.
            </p>
          </CardContent>
        </Card>
      )}

      {forbiddenMedications && forbiddenMedications.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {forbiddenMedications.map((item: ForbiddenMedication) => (
            <Card
              key={item.id}
              className="bg-white border-0 shadow-md border-l-4 border-l-red-500"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-start gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {item.medicationsName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {item.medicationsLaboratorio}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingDeleteId(item.id)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    aria-label="Remover restrição"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-gray-600 border-t border-gray-50 pt-2">
                  {item.reason}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddForbiddenMedicationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover restrição?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O medicamento deixará de aparecer
              como restrito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={() =>
                pendingDeleteId && removeForbidden(pendingDeleteId)
              }
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
