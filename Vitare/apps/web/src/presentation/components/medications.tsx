import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pill, CheckCircle, Plus, FileText, Trash2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@vitare/ui-components";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@vitare/ui-components";
import { medicationsApi } from "../../core/infrastructure/api/medications.api";
import { AddMedicationDialog } from "./add-medication-dialog";
import { ForbiddenMedicationsList } from "./forbidden-medications-list";

export function Medications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: medications,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => (await medicationsApi.findAll()).data,
  });

  const { mutate: removeMedication, isPending: isRemoving } = useMutation({
    mutationFn: (id: string) => medicationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      toast({ title: "Medicamento removido" });
      setPendingDeleteId(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Não foi possível remover o medicamento",
        description: "Tente novamente em instantes.",
      });
      setPendingDeleteId(null);
    },
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permitidos" className="w-full">
        <TabsList>
          <TabsTrigger value="permitidos">Permitidos</TabsTrigger>
          <TabsTrigger value="nao-permitidos">Não Permitidos</TabsTrigger>
        </TabsList>

        <TabsContent value="permitidos" className="space-y-6 pt-4">
          <Card className="bg-white border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#52AF7A]/10 flex items-center justify-center">
                    <Pill className="h-5 w-5 text-[#52AF7A]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Medicamentos
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {medications?.length ?? 0} medicações cadastradas
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
            <p className="text-muted-foreground text-sm">
              Carregando medicamentos...
            </p>
          )}

          {isError && (
            <p className="text-red-600 text-sm">
              Não foi possível carregar os medicamentos.
            </p>
          )}

          {!isLoading && !isError && medications?.length === 0 && (
            <Card className="bg-white border-0 shadow-md">
              <CardContent className="py-10 text-center">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum medicamento cadastrado ainda.
                </p>
              </CardContent>
            </Card>
          )}

          {medications && medications.length > 0 && (
            <Card className="bg-white border-0 shadow-md">
              <CardContent className="p-0 sm:p-6">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-gray-100">
                      <TableHead className="text-[#52AF7A] font-semibold">
                        Medicamento
                      </TableHead>
                      <TableHead className="text-[#52AF7A] font-semibold">
                        Dosagem
                      </TableHead>
                      <TableHead className="text-[#52AF7A] font-semibold hidden sm:table-cell">
                        Frequência
                      </TableHead>
                      <TableHead className="text-[#52AF7A] font-semibold text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medications.map((med) => (
                      <TableRow key={med.id} className="border-gray-50">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-[#52AF7A]" />
                            {med.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-[#52AF7A]/30 text-[#52AF7A]"
                          >
                            {med.dosage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">
                          {med.frequency}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(med.id)}
                            className="inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                            aria-label={`Remover medicamento ${med.name}`}
                            title="Remover medicamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="nao-permitidos" className="pt-4">
          <ForbiddenMedicationsList />
        </TabsContent>
      </Tabs>

      <AddMedicationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover medicamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O medicamento será removido da
              sua lista de medicamentos ativos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={() =>
                pendingDeleteId && removeMedication(pendingDeleteId)
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
