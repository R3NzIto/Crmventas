import { z } from "zod";

export const createPipelineSchema = z.object({
  name: z.string().trim().min(1),
  stages: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        order: z.number().int().nonnegative(),
        color: z.string().trim().optional()
      })
    )
    .default([])
});

export const createDealSchema = z.object({
  contactId: z.string().min(1),
  stageId: z.string().min(1),
  title: z.string().trim().min(1),
  value: z.number().nonnegative(),
  closeDate: z.string().datetime().optional(),
  status: z.enum(["open", "won", "lost"]).default("open")
});

export const updateDealSchema = createDealSchema.partial();

export const moveDealStageSchema = z.object({
  stageId: z.string().min(1)
});

export type PipelineCreateInput = z.infer<typeof createPipelineSchema>;
export type PipelineCreateDealInput = z.infer<typeof createDealSchema>;
export type PipelineUpdateDealInput = z.infer<typeof updateDealSchema>;
export type PipelineMoveDealStageInput = z.infer<typeof moveDealStageSchema>;
