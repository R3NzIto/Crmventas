import type { Prisma, WorkflowExecution, WorkflowExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { WorkflowRecord } from "@/modules/workflows/workflow.types";

export interface WorkflowRepository {
  findActiveByAgency(agencyId: string): Promise<WorkflowRecord[]>;
  createExecution(workflowId: string, contactId: string): Promise<WorkflowExecution>;
  updateExecution(id: string, status: WorkflowExecutionStatus, log: Prisma.InputJsonValue[]): Promise<WorkflowExecution>;
  addTag(contactId: string, tag: string): Promise<void>;
  moveOpenDeal(contactId: string, stageId: string): Promise<void>;
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
  async addTag(contactId, tag) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { tags: true } });
    if (!contact || contact.tags.includes(tag)) {
      return;
    }
    await prisma.contact.update({
      where: { id: contactId },
      data: { tags: [...contact.tags, tag] }
    });
  },
  async moveOpenDeal(contactId, stageId) {
    const deal = await prisma.deal.findFirst({
      where: { contactId, status: "open" },
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
