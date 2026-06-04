import { z } from "zod";
import { workflowQueuePort, type WorkflowExecutionJob } from "@/modules/workflows/workflow.queue";
import { workflowRepository, type WorkflowRepository } from "@/modules/workflows/workflow.repository";
import type {
  WorkflowRecord,
  WorkflowTriggerDefinition,
  WorkflowTriggerPayload
} from "@/modules/workflows/workflow.types";

const triggerDefinitionSchema = z.object({
  type: z.enum(["contact_created", "tag_added", "stage_changed", "form_submitted", "message_received", "lead_qualified"]),
  tag: z.string().optional(),
  stageId: z.string().optional(),
  formId: z.string().optional(),
  channel: z.enum(["email", "sms", "whatsapp"]).optional(),
  keyword: z.string().optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  intent: z.string().optional(),
  urgency: z.string().optional()
});

export interface WorkflowQueuePort {
  add(name: "run", data: WorkflowExecutionJob): Promise<unknown>;
}

export function parseWorkflowTrigger(trigger: unknown): WorkflowTriggerDefinition | null {
  const parsed = triggerDefinitionSchema.safeParse(trigger);
  return parsed.success ? parsed.data : null;
}

export function workflowMatchesTrigger(workflow: WorkflowRecord, payload: WorkflowTriggerPayload): boolean {
  const trigger = parseWorkflowTrigger(workflow.trigger);
  if (!workflow.isActive || !trigger || trigger.type !== payload.type) {
    return false;
  }
  if (trigger.tag && trigger.tag !== payload.tag) {
    return false;
  }
  if (trigger.stageId && trigger.stageId !== payload.stageId) {
    return false;
  }
  if (trigger.formId && trigger.formId !== payload.formId) {
    return false;
  }
  if (trigger.channel && trigger.channel !== payload.channel) {
    return false;
  }
  if (trigger.keyword && !payload.content?.toLowerCase().includes(trigger.keyword.toLowerCase())) {
    return false;
  }
  if (trigger.minScore !== undefined && (payload.leadScore ?? 0) < trigger.minScore) {
    return false;
  }
  if (trigger.intent && trigger.intent !== payload.intent) {
    return false;
  }
  if (trigger.urgency && trigger.urgency !== payload.urgency) {
    return false;
  }
  return true;
}

export function createWorkflowEngine(
  repository: WorkflowRepository = workflowRepository,
  queue: WorkflowQueuePort = workflowQueuePort
) {
  return {
    async handleTrigger(payload: WorkflowTriggerPayload): Promise<number> {
      const workflows = await repository.findActiveByAgency(payload.agencyId);
      const matchingWorkflows = workflows.filter((workflow) => workflowMatchesTrigger(workflow, payload));

      for (const workflow of matchingWorkflows) {
        const execution = await repository.createExecution(workflow.id, payload.contactId);
        await queue.add("run", {
          executionId: execution.id,
          workflowId: workflow.id,
          contactId: payload.contactId,
          agencyId: payload.agencyId,
          triggerPayload: {
            conversationId: payload.conversationId,
            channel: payload.channel,
            content: payload.content,
            leadScore: payload.leadScore,
            intent: payload.intent,
            urgency: payload.urgency
          }
        });
      }

      return matchingWorkflows.length;
    }
  };
}

export const workflowEngine = createWorkflowEngine();
