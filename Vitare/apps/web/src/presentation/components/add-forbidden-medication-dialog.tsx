/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import { Textarea } from "@vitare/ui-components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@vitare/ui-components";
import { useToast } from "../hooks/use-toast";

import { forbiddenMedicationsApi } from "../../core/infrastructure/api/forbidden-medications.api";
import { MedicationAutocomplete } from "./medications-autocomplete";
import type { MedicationSearchResult } from "../../core/infrastructure/api/medication-dictionary.api";

interface AddForbiddenMedicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddForbiddenMedicationDialog({
  open,
  onOpenChange,
}: AddForbiddenMedicationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMedicamento, setSelectedMedicamento] =
    useState<MedicationSearchResult | null>(null);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      forbiddenMedicationsApi.create({
        medicationsDictionaryId: selectedMedicamento!.id,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forbidden-medications"] });
      toast({ title: "Medicamento proibido adicionado" });
      handleClose();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message;
      const isConflict = error?.response?.status === 409;
      toast({
        variant: "destructive",
        title: isConflict ? "Já cadastrado" : "Não foi possível salvar",
        description: Array.isArray(message)
          ? message[0]
          : (message ??
            (isConflict
              ? "Este medicamento já está na sua lista de proibidos."
              : "Tente novamente.")),
      });
    },
  });

  function handleClose() {
    setSelectedMedicamento(null);
    setReason("");
    setValidationError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!selectedMedicamento) {
      setValidationError("Selecione um medicamento");
      return;
    }
    if (reason.trim().length < 3) {
      setValidationError("Informe o motivo da restrição (mínimo 3 caracteres)");
      return;
    }

    mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Adicionar Medicamento Não Permitido
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-black hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && (
            <p className="text-sm text-red-600 text-center bg-red-50 border border-red-100 rounded-md py-2 px-3">
              {validationError}
            </p>
          )}

          <div className="grid gap-2">
            <Label>Medicamento</Label>
            <MedicationAutocomplete
              selected={selectedMedicamento}
              onSelect={setSelectedMedicamento}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo da restrição</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Alergia cruzada com Dipirona"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
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
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-70"
            >
              {isPending ? "Salvando..." : "Adicionar Restrição"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
