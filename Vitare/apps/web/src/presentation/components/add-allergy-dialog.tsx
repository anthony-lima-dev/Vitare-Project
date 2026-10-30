/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { z } from "zod";

import { Button } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import { Textarea } from "@vitare/ui-components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vitare/ui-components";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@vitare/ui-components";
import { useToast } from "../hooks/use-toast";

import { allergiesApi } from "../../core/infrastructure/api/allergies.api";

const SEVERITY_OPTIONS = [
  { value: "LEVE", label: "Leve" },
  { value: "MODERADA", label: "Moderada" },
  { value: "GRAVE", label: "Grave" },
];

const createAllergySchema = z.object({
  name: z.string().min(1, "Informe o nome da alergia").max(255),
  severity: z.string().optional(),
  notes: z.string().optional(),
});

type CreateAllergyFormValues = z.infer<typeof createAllergySchema>;

interface AddAllergyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAllergyDialog({
  open,
  onOpenChange,
}: AddAllergyDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAllergyFormValues>({
    resolver: zodResolver(createAllergySchema),
    defaultValues: { name: "", severity: "", notes: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreateAllergyFormValues) =>
      allergiesApi.create({
        name: values.name,
        severity: values.severity || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allergies"] });
      toast({ title: "Alergia adicionada", description: "Salva com sucesso." });
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
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Adicionar Alergia
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
            <Label htmlFor="name">Nome da alergia</Label>
            <Input
              id="name"
              placeholder="Ex: Amendoim, Picada de Insetos"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="severity">Severidade</Label>
            <Controller
              name="severity"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
              disabled={isPending}
              className="bg-[#52AF7A] hover:bg-[#458f63] text-white disabled:opacity-70"
            >
              {isPending ? "Salvando..." : "Salvar Alergia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
