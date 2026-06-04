import { z } from "zod";

export const leadQualificationResultSchema = z.object({
  isLead: z.boolean(),
  leadScore: z.number().int().min(0).max(100),
  intent: z.enum(["pricing", "demo", "buying_interest", "support", "spam", "follow_up", "other"]),
  urgency: z.enum(["low", "medium", "high"]),
  summary: z.string().min(1),
  recommendedAction: z.string().min(1),
  suggestedTags: z.array(z.string()).default([])
});

export const leadFiltersSchema = z.object({
  minScore: z.coerce.number().int().min(0).max(100).default(60),
  intent: z.enum(["pricing", "demo", "buying_interest", "support", "spam", "follow_up", "other"]).optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  isLead: z.coerce.boolean().default(true),
  search: z.string().trim().optional()
});

export type LeadQualificationResult = z.infer<typeof leadQualificationResultSchema>;
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
