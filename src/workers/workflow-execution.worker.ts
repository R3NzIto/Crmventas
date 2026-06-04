import { Worker } from "bullmq";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inboxService } from "@/modules/inbox/inbox.service";
import { workflowRedisConnectionOptions } from "@/modules/workflows/workflow.queue";
import { workflowRepository } from "@/modules/workflows/workflow.repository";
import type { WorkflowExecutionJob } from "@/modules/workflows/workflow.queue";
import type { WorkflowStepDefinition } from "@/modules/workflows/workflow.types";

type WorkflowExecutionLogEntry = Prisma.InputJsonObject & {
  step: string;
  status: "completed" | "failed";
  at: string;
  label: string;
  detail?: string;
};

function isWorkflowStep(value: unknown): value is WorkflowStepDefinition {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  const type = (value as { type: unknown }).type;
  return ["send_email", "add_tag", "move_pipeline_stage", "wait_delay", "create_task", "send_message"].includes(String(type));
}

function describeStep(step: WorkflowStepDefinition): string {
  if (step.type === "add_tag") {
    return `Agregar tag${step.tag ? ` "${step.tag}"` : ""}`;
  }
  if (step.type === "move_pipeline_stage") {
    return `Mover oportunidad a etapa${step.stageId ? ` ${step.stageId}` : ""}`;
  }
  if (step.type === "wait_delay") {
    return `Esperar ${step.delayMs ? Math.round(step.delayMs / 1000) : 0} segundos`;
  }
  if (step.type === "send_message") {
    return "Enviar mensaje";
  }
  if (step.type === "send_email") {
    return "Enviar email";
  }
  if (step.type === "create_task") {
    return `Crear tarea${step.title ? ` "${step.title}"` : ""}`;
  }
  return step.type;
}

async function wait(delayMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function processWorkflowExecution(data: WorkflowExecutionJob): Promise<void> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: data.executionId },
    include: { workflow: true }
  });
  if (!execution) {
    return;
  }

  const log: WorkflowExecutionLogEntry[] = [];
  await workflowRepository.updateExecution(execution.id, "running", log);

  try {
    for (const rawStep of execution.workflow.steps) {
      if (!isWorkflowStep(rawStep)) {
        continue;
      }

      if (rawStep.type === "add_tag" && rawStep.tag) {
        await workflowRepository.addTag(data.contactId, rawStep.tag);
      }
      if (rawStep.type === "move_pipeline_stage" && rawStep.stageId) {
        await workflowRepository.moveOpenDeal(data.contactId, rawStep.stageId);
      }
      if (rawStep.type === "wait_delay" && rawStep.delayMs) {
        await wait(rawStep.delayMs);
      }
      if (rawStep.type === "send_message") {
        const conversationId = rawStep.conversationId ?? data.triggerPayload?.conversationId;
        const message = rawStep.message ?? rawStep.template;
        if (conversationId && message) {
          await inboxService.sendMessage(conversationId, message, data.agencyId, "workflow");
        }
      }

      log.push({
        step: rawStep.type,
        status: "completed",
        at: new Date().toISOString(),
        label: describeStep(rawStep),
        detail: rawStep.tag ?? rawStep.stageId ?? rawStep.message ?? rawStep.subject ?? rawStep.title
      });
      await workflowRepository.updateExecution(execution.id, "running", log);
    }

    await workflowRepository.updateExecution(execution.id, "completed", log);
  } catch (error) {
    log.push({
      step: "error",
      status: "failed",
      at: new Date().toISOString(),
      label: "Error al ejecutar automatizacion",
      detail: error instanceof Error ? error.message : "Fallo desconocido"
    });
    await workflowRepository.updateExecution(execution.id, "failed", log);
    throw error;
  }
}

export const workflowExecutionWorker = new Worker<WorkflowExecutionJob>(
  "workflow-execution",
  async (job) => processWorkflowExecution(job.data),
  { connection: workflowRedisConnectionOptions() }
);
