import type { Deal, Pipeline, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PipelineCreateDealInput, PipelineCreateInput, PipelineUpdateDealInput } from "@/modules/pipelines/pipeline.schemas";

export type PipelineWithStages = Prisma.PipelineGetPayload<{
  include: {
    stages: {
      include: {
        deals: {
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
    };
  };
}>;

export interface PipelineRepository {
  findPipelines(agencyId: string): Promise<PipelineWithStages[]>;
  createPipeline(agencyId: string, input: PipelineCreateInput): Promise<PipelineWithStages>;
  updatePipeline(agencyId: string, id: string, input: Pick<PipelineCreateInput, "name">): Promise<Pipeline | null>;
  deletePipeline(agencyId: string, id: string): Promise<Pipeline | null>;
  findDealsByPipeline(agencyId: string, pipelineId: string): Promise<Deal[]>;
  findDealById(agencyId: string, dealId: string): Promise<Deal | null>;
  createDeal(agencyId: string, pipelineId: string, input: PipelineCreateDealInput): Promise<Deal | null>;
  updateDeal(agencyId: string, dealId: string, input: PipelineUpdateDealInput): Promise<Deal | null>;
  deleteDeal(agencyId: string, dealId: string): Promise<Deal | null>;
  moveDealToStage(agencyId: string, dealId: string, stageId: string): Promise<Deal | null>;
  findStageInAgency(agencyId: string, stageId: string): Promise<{ id: string } | null>;
}

export const pipelineRepository: PipelineRepository = {
  findPipelines(agencyId) {
    return prisma.pipeline.findMany({
      where: { agencyId },
      include: {
        stages: {
          include: {
            deals: {
              where: { contact: { agencyId } },
              include: {
                contact: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              },
              orderBy: { closeDate: "asc" }
            }
          },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  },
  createPipeline(agencyId, input) {
    return prisma.pipeline.create({
      data: {
        agencyId,
        name: input.name,
        stages: {
          create: input.stages.map((stage) => ({
            name: stage.name,
            order: stage.order,
            color: stage.color
          }))
        }
      },
      include: {
        stages: {
          include: {
            deals: {
              where: { contact: { agencyId } },
              include: {
                contact: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              },
              orderBy: { closeDate: "asc" }
            }
          },
          orderBy: { order: "asc" }
        }
      }
    });
  },
  async updatePipeline(agencyId, id, input) {
    const pipeline = await prisma.pipeline.findFirst({ where: { id, agencyId }, select: { id: true } });
    if (!pipeline) {
      return null;
    }
    return prisma.pipeline.update({ where: { id }, data: { name: input.name } });
  },
  async deletePipeline(agencyId, id) {
    const pipeline = await prisma.pipeline.findFirst({ where: { id, agencyId }, select: { id: true } });
    if (!pipeline) {
      return null;
    }
    return prisma.pipeline.delete({ where: { id } });
  },
  findDealsByPipeline(agencyId, pipelineId) {
    return prisma.deal.findMany({
      where: {
        stage: {
          pipelineId,
          pipeline: { agencyId }
        }
      },
      orderBy: { closeDate: "asc" }
    });
  },
  findDealById(agencyId, dealId) {
    return prisma.deal.findFirst({
      where: {
        id: dealId,
        contact: { agencyId }
      }
    });
  },
  async createDeal(agencyId, pipelineId, input) {
    const stage = await prisma.stage.findFirst({
      where: { id: input.stageId, pipelineId, pipeline: { agencyId } },
      select: { id: true }
    });
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, agencyId },
      select: { id: true }
    });
    if (!stage || !contact) {
      return null;
    }

    return prisma.deal.create({
      data: {
        stageId: stage.id,
        contactId: contact.id,
        title: input.title,
        value: input.value,
        closeDate: input.closeDate ? new Date(input.closeDate) : undefined,
        status: input.status
      }
    });
  },
  async updateDeal(agencyId, dealId, input) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, contact: { agencyId } },
      select: { id: true }
    });
    if (!deal) {
      return null;
    }
    if (input.contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: input.contactId, agencyId }, select: { id: true } });
      if (!contact) {
        return null;
      }
    }
    if (input.stageId) {
      const stage = await prisma.stage.findFirst({ where: { id: input.stageId, pipeline: { agencyId } }, select: { id: true } });
      if (!stage) {
        return null;
      }
    }

    return prisma.deal.update({
      where: { id: deal.id },
      data: {
        ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
        ...(input.stageId !== undefined ? { stageId: input.stageId } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.closeDate !== undefined ? { closeDate: new Date(input.closeDate) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      }
    });
  },
  async deleteDeal(agencyId, dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, contact: { agencyId } },
      select: { id: true }
    });
    if (!deal) {
      return null;
    }
    return prisma.deal.delete({ where: { id: deal.id } });
  },
  async moveDealToStage(agencyId, dealId, stageId) {
    const targetStage = await prisma.stage.findFirst({
      where: { id: stageId, pipeline: { agencyId } },
      select: { id: true }
    });
    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        contact: { agencyId }
      },
      select: { id: true }
    });
    if (!targetStage || !deal) {
      return null;
    }
    return prisma.deal.update({
      where: { id: deal.id },
      data: { stageId: targetStage.id }
    });
  },
  findStageInAgency(agencyId, stageId) {
    return prisma.stage.findFirst({
      where: { id: stageId, pipeline: { agencyId } },
      select: { id: true }
    });
  }
};
