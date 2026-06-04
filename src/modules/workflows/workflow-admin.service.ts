import type { Prisma, Workflow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { WorkflowCreateInput, WorkflowUpdateInput } from "@/modules/workflows/workflow.schemas";

export type WorkflowWithExecutions = Prisma.WorkflowGetPayload<{
  include: {
    executions: {
      orderBy: { startedAt: "desc" };
      take: 10;
      include: {
        contact: {
          select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
          };
        };
      };
    };
  };
}>;

export class WorkflowAdminNotFoundError extends Error {
  constructor() {
    super("Automatizacion no encontrada");
  }
}

function toJsonObject(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toJsonArray(values: unknown[]): Prisma.InputJsonValue[] {
  return values.map((value) => toJsonObject(value));
}

export function createWorkflowAdminService() {
  return {
    listWorkflows(agencyId: string): Promise<WorkflowWithExecutions[]> {
      return prisma.workflow.findMany({
        where: { agencyId },
        include: {
          executions: {
            orderBy: { startedAt: "desc" },
            take: 10,
            include: {
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { name: "asc" }
      });
    },

    async getWorkflowById(agencyId: string, id: string): Promise<WorkflowWithExecutions> {
      const workflow = await prisma.workflow.findFirst({
        where: { id, agencyId },
        include: {
          executions: {
            orderBy: { startedAt: "desc" },
            take: 10,
            include: {
              contact: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });
      if (!workflow) {
        throw new WorkflowAdminNotFoundError();
      }
      return workflow;
    },

    createWorkflow(agencyId: string, input: WorkflowCreateInput): Promise<Workflow> {
      return prisma.workflow.create({
        data: {
          agencyId,
          name: input.name,
          trigger: toJsonObject(input.trigger),
          steps: toJsonArray(input.steps),
          isActive: input.isActive
        }
      });
    },

    async updateWorkflow(agencyId: string, id: string, input: WorkflowUpdateInput): Promise<Workflow> {
      const workflow = await prisma.workflow.findFirst({ where: { id, agencyId }, select: { id: true } });
      if (!workflow) {
        throw new WorkflowAdminNotFoundError();
      }
      return prisma.workflow.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.trigger !== undefined ? { trigger: toJsonObject(input.trigger) } : {}),
          ...(input.steps !== undefined ? { steps: toJsonArray(input.steps) } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
        }
      });
    },

    async deleteWorkflow(agencyId: string, id: string): Promise<Workflow> {
      const workflow = await prisma.workflow.findFirst({ where: { id, agencyId }, select: { id: true } });
      if (!workflow) {
        throw new WorkflowAdminNotFoundError();
      }
      return prisma.workflow.delete({ where: { id } });
    }
  };
}

export const workflowAdminService = createWorkflowAdminService();
