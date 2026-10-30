import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, Calendar, Trash2, Plus, FileText } from "lucide-react";

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

import { conditionsApi } from "../../core/infrastructure/api/condition.api";
import type { ChronicCondition } from "@vitare/core-typings";
import { AddConditionDialog } from "./add-condition-dialog";

function formatDate(value: string | null): string {
  if (!value) return "Data não informada";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function ChronicDiseases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: conditions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["conditions"],
    queryFn: async () => (await conditionsApi.findAll()).data,
  });

  const { mutate: removeCondition, isPending: isRemoving } = useMutation({
    mutationFn: (id: string) => conditionsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
      toast({ title: "Condição removida" });
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
                <HeartPulse className="h-5 w-5 text-[#52AF7A]" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Doenças Crônicas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {conditions?.length ?? 0} condições cadastradas
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
        <p className="text-muted-foreground text-sm">Carregando condições...</p>
      )}

      {isError && (
        <p className="text-red-600 text-sm">
          Não foi possível carregar as condições crônicas.
        </p>
      )}

      {!isLoading && !isError && conditions?.length === 0 && (
        <Card className="bg-white border-0 shadow-md">
          <CardContent className="py-10 text-center">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma condição crônica cadastrada ainda.
            </p>
          </CardContent>
        </Card>
      )}

      {conditions && conditions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {conditions.map((condition: ChronicCondition) => (
            <Card key={condition.id} className="bg-white border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {condition.diseaseName}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-1 border-[#52AF7A]/30 text-[#52AF7A] font-mono text-xs"
                    >
                      {condition.diseaseCode}
                    </Badge>
                  </div>
                  <button
                    onClick={() => setPendingDeleteId(condition.id)}
                    className="text-gray-300 hover:text-red-500 shrink-0"
                    aria-label="Remover condição"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Diagnosticado em {formatDate(condition.diagnosedAt)}
                </div>

                {condition.notes && (
                  <p className="mt-2 text-sm text-gray-600 border-t border-gray-50 pt-2">
                    {condition.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddConditionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover condição crônica?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A condição será removida do seu
              histórico ativo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={() =>
                pendingDeleteId && removeCondition(pendingDeleteId)
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
