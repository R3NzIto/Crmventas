import { z } from "zod";

export const formFieldTypeSchema = z.enum(["text", "email", "phone", "textarea", "select", "checkbox"]);

export const formFieldSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: formFieldTypeSchema,
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).default([])
});

export const createFormSchema = z.object({
  name: z.string().trim().min(1),
  fields: z.array(formFieldSchema).min(1),
  workflowId: z.string().trim().min(1).nullable().optional()
});

export const updateFormSchema = createFormSchema.partial();

export const publicFormSubmissionSchema = z.object({
  data: z.record(z.string(), z.unknown())
});

export type FormFieldInput = z.infer<typeof formFieldSchema>;
export type FormCreateInput = z.infer<typeof createFormSchema>;
export type FormUpdateInput = z.infer<typeof updateFormSchema>;
export type PublicFormSubmissionInput = z.infer<typeof publicFormSubmissionSchema>;
