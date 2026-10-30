import { z } from "zod";

const today = new Date();
today.setHours(23, 59, 59, 999);

export const createConditionSchema = z.object({
  diseaseId: z.uuid("Selecione uma condição da lista"),
  diagnosedAt: z
    .string()
    .optional()
    .refine(
      (value) => !value || new Date(value) <= today,
      "A data do diagnóstico não pode ser futura",
    ),
  notes: z.string().optional(),
});

export type CreateConditionFormValues = z.infer<typeof createConditionSchema>;
