import { z } from "zod";

export const workflowTriggerSchema = z.object({
  type: z.enum(["contact_created", "tag_added", "stage_changed", "form_submitted", "message_received", "lead_qualified"]),
  tag: z.string().trim().optional(),
  stageId: z.string().trim().optional(),
  formId: z.string().trim().optional(),
  channel: z.enum(["email", "sms", "whatsapp"]).optional(),
  keyword: z.string().trim().optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  intent: z.string().trim().optional(),
  urgency: z.string().trim().optional()
});

export const workflowStepSchema = z.object({
  type: z.enum(["send_email", "add_tag", "move_pipeline_stage", "wait_delay", "create_task", "send_message"]),
  tag: z.string().trim().optional(),
  stageId: z.string().trim().optional(),
  delayMs: z.number().int().nonnegative().optional(),
  subject: z.string().trim().optional(),
  body: z.string().trim().optional(),
  title: z.string().trim().optional(),
  conversationId: z.string().trim().optional(),
  message: z.string().trim().optional(),
  template: z.string().trim().optional()
});

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1),
  trigger: workflowTriggerSchema,
  steps: z.array(workflowStepSchema).default([]),
  isActive: z.boolean().default(false)
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

export type WorkflowCreateInput = z.infer<typeof createWorkflowSchema>;
export type WorkflowUpdateInput = z.infer<typeof updateWorkflowSchema>;
export type WorkflowTriggerInput = z.infer<typeof workflowTriggerSchema>;
export type WorkflowStepInput = z.infer<typeof workflowStepSchema>;
