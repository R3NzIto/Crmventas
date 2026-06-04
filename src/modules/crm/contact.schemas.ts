import { z } from "zod";

export const contactFiltersSchema = z.object({
  search: z.string().trim().optional(),
  tag: z.string().trim().optional()
});

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email().optional(),
  phone: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  customFields: z.record(z.string(), z.unknown()).default({}),
  source: z.string().trim().optional()
});

export const updateContactSchema = createContactSchema.partial();

export type CrmContactFilters = z.infer<typeof contactFiltersSchema>;
export type CrmCreateContactInput = z.infer<typeof createContactSchema>;
export type CrmUpdateContactInput = z.infer<typeof updateContactSchema>;
