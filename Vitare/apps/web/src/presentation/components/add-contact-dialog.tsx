/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { z } from "zod";

import { Button } from "@vitare/ui-components";
import { Input } from "@vitare/ui-components";
import { Label } from "@vitare/ui-components";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@vitare/ui-components";
import { useToast } from "../hooks/use-toast";

import { contactsApi } from "../../core/infrastructure/api/contacts.api";

const PHONE_PATTERN = /^\(\d{2}\) \d{4,5}-\d{4}$/;

const createContactSchema = z.object({
  name: z.string().min(1, "Informe o nome do contato").max(255),
  phone: z
    .string()
    .regex(PHONE_PATTERN, "Use o formato (11) 1234-5678 ou (11) 91234-5678"),
  relationship: z.string().max(100).optional(),
  isPrimary: z.boolean(),
});

type CreateContactFormValues = z.infer<typeof createContactSchema>;

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddContactDialog({
  open,
  onOpenChange,
}: AddContactDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContactFormValues>({
    resolver: zodResolver(createContactSchema),
    defaultValues: {
      name: "",
      phone: "",
      relationship: "",
      isPrimary: false,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (values: CreateContactFormValues) => contactsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast({ title: "Contato adicionado", description: "Salvo com sucesso." });
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
              Adicionar Contato de Emergência
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
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: João Alves"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-1234"
              {...register("phone", {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  const rawValue = e.target.value;
                  e.target.value = formatPhoneInput(rawValue);
                },
              })}
            />
            {errors.phone && (
              <p className="text-xs text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="relationship">Relação (opcional)</Label>
            <Input
              id="relationship"
              placeholder="Ex: Esposo, Médico Cardiologista"
              {...register("relationship")}
            />
            {errors.relationship && (
              <p className="text-xs text-red-600">
                {errors.relationship.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-gray-200 p-3">
            <div>
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Contato principal
              </Label>
              <p className="text-xs text-muted-foreground">
                Aparece em destaque e primeiro na lista de emergência.
              </p>
            </div>
            <Controller
              name="isPrimary"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isPrimary"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Contato principal"
                />
              )}
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
              className="bg-[#52AF7A] hover:bg-[#458f63] text-white disabled:opacity-70"
            >
              {isPending ? "Salvando..." : "Salvar Contato"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
