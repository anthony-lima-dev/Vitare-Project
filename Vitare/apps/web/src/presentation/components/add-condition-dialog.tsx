/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
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

import { conditionsApi } from "../../core/infrastructure/api/condition.api";
import { DiseaseAutocomplete } from "./disease-autocomplete";
import type { DiseaseSearchResult } from "../../core/infrastructure/api/disease-dictionary.api";
import {
  createConditionSchema,
  type CreateConditionFormValues,
} from "../schemas/condition.schema";

interface AddConditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddConditionDialog({
  open,
  onOpenChange,
}: AddConditionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDisease, setSelectedDisease] =
    useState<DiseaseSearchResult | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateConditionFormValues>({
    resolver: zodResolver(createConditionSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreateConditionFormValues) =>
      conditionsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
      toast({
        title: "Condição adicionada",
        description: "Salva com sucesso.",
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
    setSelectedDisease(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Adicionar Condição
            </DialogTitle>
            <button
              onClick={handleClose}
              className="text-black hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutate(values))}
          className="space-y-4"
        >
          <div className="grid gap-2">
            <Label>Condição (CID-10)</Label>
            <DiseaseAutocomplete
              selected={selectedDisease}
              onSelect={(disease) => {
                setSelectedDisease(disease);
                setValue("diseaseId", disease?.id ?? "", {
                  shouldValidate: true,
                });
              }}
            />
            {errors.diseaseId && (
              <p className="text-xs text-red-600">{errors.diseaseId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="diagnosedAt">Data do diagnóstico</Label>
            <Input id="diagnosedAt" type="date" {...register("diagnosedAt")} />
            {errors.diagnosedAt && (
              <p className="text-xs text-red-600">
                {errors.diagnosedAt.message}
              </p>
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
              disabled={isPending || !selectedDisease}
              className="bg-[#52AF7A] hover:bg-[#458f63] text-white disabled:opacity-70"
            >
              {isPending ? "Salvando..." : "Salvar Condição"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
