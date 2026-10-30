import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Plus, Trash2, FileText } from "lucide-react";

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

import { allergiesApi } from "../../core/infrastructure/api/allergies.api";
import type { Allergy } from "@vitare/core-typings";
import { AddAllergyDialog } from "./add-allergy-dialog";

export function Allergies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: allergies,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["allergies"],
    queryFn: async () => (await allergiesApi.findAll()).data,
  });

  const { mutate: removeAllergy, isPending: isRemoving } = useMutation({
    mutationFn: (id: string) => allergiesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allergies"] });
      toast({ title: "Alergia removida" });
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
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Alergias
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {allergies?.length ?? 0} alergias cadastradas
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
        <p className="text-muted-foreground text-sm">Carregando alergias...</p>
      )}

      {isError && (
        <p className="text-red-600 text-sm">
          Não foi possível carregar suas alergias.
        </p>
      )}

      {!isLoading && !isError && allergies?.length === 0 && (
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="py-10 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma alergia cadastrada ainda.
            </p>
          </CardContent>
        </Card>
      )}

      {allergies && allergies.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {allergies.map((allergy: Allergy) => (
            <Card key={allergy.id} className="bg-white border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {allergy.name}
                    </p>
                    {allergy.severity && (
                      <Badge
                        variant="outline"
                        className="mt-1 border-amber-300 text-amber-700 text-xs"
                      >
                        {allergy.severity}
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => setPendingDeleteId(allergy.id)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    aria-label="Remover alergia"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {allergy.notes && (
                  <p className="mt-3 text-sm text-gray-600 border-t border-gray-50 pt-2">
                    {allergy.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddAllergyDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover alergia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A alergia será removida
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={() => pendingDeleteId && removeAllergy(pendingDeleteId)}
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
