/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Textarea } from "@vitare/ui-components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@vitare/ui-components";
import { useToast } from "../hooks/use-toast";

import { medicationsApi } from "../../core/infrastructure/api/medications.api";
import { MedicationAutocomplete } from "./medications-autocomplete";
import { ApresentationSelect } from "./select-apresentation";
import type { MedicationSearchResult } from "../../core/infrastructure/api/medication-dictionary.api";
import { z } from "zod";

const createMedicationSchema = z.object({
  name: z.string().min(1, "Selecione um medicamento"),
  dosage: z.string().min(1, "Selecione a apresentação"),
  frequency: z.string().min(1, "Informe a frequência de uso"),
  startDate: z.string().min(1, "Informe a data de início"),
  notes: z.string().optional(),
  medicationsDictionaryId: z.string().uuid().optional(),
});

type CreateMedicationFormValues = z.infer<typeof createMedicationSchema>;

interface AddMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMedicationDialog({
  open,
  onOpenChange,
}: AddMedicationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMedication, setSelectedMedication] =
    useState<MedicationSearchResult | null>(null);
  const [selectedApresentation, setSelectedApresentation] = useState("");

  const {
    handleSubmit,
    setValue,
    reset,
    register,
    formState: { errors },
  } = useForm<CreateMedicationFormValues>({
    resolver: zodResolver(createMedicationSchema),
  });

  // Ao trocar de medicamento, a apresentação anterior deixa de ser válida —
  // limpa a seleção do segundo estágio para evitar dosagem inconsistente
  // com o produto recém-escolhido.
  useEffect(() => {
    setSelectedApresentation("");
    setValue("dosage", "");
    setValue("name", selectedMedication?.nome ?? "");
    setValue("medicationsDictionaryId", selectedMedication?.id ?? "");
  }, [selectedMedication, setValue]);

  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreateMedicationFormValues) =>
      medicationsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      toast({
        title: "Medicamento adicionado",
        description: "Salvo com sucesso.",
      });
      handleClose();
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

  function handleClose() {
    reset();
    setSelectedMedication(null);
    setSelectedApresentation("");
    onOpenChange(false);
  }

  function handleApresentationChange(value: string) {
    setSelectedApresentation(value);
    setValue("dosage", value, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Adicionar Medicamento
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-black hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-4">
          <div className="grid gap-2">
            <Label>Medicamento</Label>
            <MedicationAutocomplete
              selected={selectedMedication}
              onSelect={setSelectedMedication}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <ApresentationSelect
            apresentacoes={selectedMedication?.apresentacoes ?? []}
            value={selectedApresentation}
            onChange={handleApresentationChange}
            disabled={!selectedMedication}
          />
          {errors.dosage && (
            <p className="text-xs text-red-600 -mt-2">
              {errors.dosage.message}
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="frequency">Frequência</Label>
            <Input
              id="frequency"
              placeholder="Ex: A cada 8 horas"
              {...register("frequency")}
            />
            {errors.frequency && (
              <p className="text-xs text-red-600">{errors.frequency.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="startDate">Data de início</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && (
              <p className="text-xs text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isPending || !selectedMedication || !selectedApresentation
              }
              className="bg-[#52AF7A] hover:bg-[#458f63] text-white disabled:opacity-70"
            >
              {isPending ? "Salvando..." : "Salvar Medicamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
