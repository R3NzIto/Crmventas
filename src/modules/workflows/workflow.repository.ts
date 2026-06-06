import type { Prisma, WorkflowExecution, WorkflowExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { WorkflowRecord } from "@/modules/workflows/workflow.types";

export interface WorkflowRepository {
  findActiveByAgency(agencyId: string): Promise<WorkflowRecord[]>;
  createExecution(workflowId: string, contactId: string): Promise<WorkflowExecution>;
  updateExecution(id: string, status: WorkflowExecutionStatus, log: Prisma.InputJsonValue[]): Promise<WorkflowExecution>;
  addTag(agencyId: string, contactId: string, tag: string): Promise<void>;
  moveOpenDeal(agencyId: string, contactId: string, stageId: string): Promise<void>;
}

export const workflowRepository: WorkflowRepository = {
  findActiveByAgency(agencyId) {
    return prisma.workflow.findMany({
      where: { agencyId, isActive: true }
    });
  },
  createExecution(workflowId, contactId) {
    return prisma.workflowExecution.create({
      data: {
        workflowId,
        contactId,
        status: "pending",
        log: []
      }
    });
  },
  updateExecution(id, status, log) {
    return prisma.workflowExecution.update({
      where: { id },
      data: { status, log }
    });
  },
  async addTag(agencyId, contactId, tag) {
    const contact = await prisma.contact.findFirst({ where: { id: contactId, agencyId }, select: { tags: true } });
    if (!contact || contact.tags.includes(tag)) {
      return;
    }
    await prisma.contact.update({
      where: { id: contactId },
      data: { tags: [...contact.tags, tag] }
    });
  },
  async moveOpenDeal(agencyId, contactId, stageId) {
    const targetStage = await prisma.stage.findFirst({
      where: { id: stageId, pipeline: { agencyId } },
      select: { id: true }
    });
    if (!targetStage) {
      return;
    }

    const deal = await prisma.deal.findFirst({
      where: { contactId, status: "open", contact: { agencyId } },
      select: { id: true }
    });
    if (!deal) {
      return;
    }
    await prisma.deal.update({
      where: { id: deal.id },
      data: { stageId }
    });
  }
};
