import type { Deal } from "@prisma/client";
import { pipelineRepository, type PipelineRepository, type PipelineWithStages } from "@/modules/pipelines/pipeline.repository";
import type { PipelineCreateDealInput, PipelineCreateInput, PipelineUpdateDealInput } from "@/modules/pipelines/pipeline.schemas";

export class PipelineResourceNotFoundError extends Error {
  constructor(message = "Pipeline resource not found") {
    super(message);
  }
}

export function createPipelineService(repository: PipelineRepository = pipelineRepository) {
  return {
    getPipelines(agencyId: string): Promise<PipelineWithStages[]> {
      return repository.findPipelines(agencyId);
    },
    createPipeline(agencyId: string, input: PipelineCreateInput): Promise<PipelineWithStages> {
      return repository.createPipeline(agencyId, input);
    },
    async updatePipeline(agencyId: string, id: string, input: Pick<PipelineCreateInput, "name">) {
      const pipeline = await repository.updatePipeline(agencyId, id, input);
      if (!pipeline) {
        throw new PipelineResourceNotFoundError("Pipeline not found");
      }
      return pipeline;
    },
    async deletePipeline(agencyId: string, id: string) {
      const pipeline = await repository.deletePipeline(agencyId, id);
      if (!pipeline) {
        throw new PipelineResourceNotFoundError("Pipeline not found");
      }
      return pipeline;
    },
    getDealsByPipeline(agencyId: string, pipelineId: string): Promise<Deal[]> {
      return repository.findDealsByPipeline(agencyId, pipelineId);
    },
    async getDealById(agencyId: string, dealId: string): Promise<Deal> {
      const deal = await repository.findDealById(agencyId, dealId);
      if (!deal) {
        throw new PipelineResourceNotFoundError("Oportunidad no encontrada");
      }
      return deal;
    },
    async createDeal(agencyId: string, pipelineId: string, input: PipelineCreateDealInput): Promise<Deal> {
      const deal = await repository.createDeal(agencyId, pipelineId, input);
      if (!deal) {
        throw new PipelineResourceNotFoundError("Etapa o contacto no encontrado");
      }
      return deal;
    },
    async updateDeal(agencyId: string, dealId: string, input: PipelineUpdateDealInput): Promise<Deal> {
      const deal = await repository.updateDeal(agencyId, dealId, input);
      if (!deal) {
        throw new PipelineResourceNotFoundError("Oportunidad no encontrada");
      }
      return deal;
    },
    async deleteDeal(agencyId: string, dealId: string): Promise<Deal> {
      const deal = await repository.deleteDeal(agencyId, dealId);
      if (!deal) {
        throw new PipelineResourceNotFoundError("Oportunidad no encontrada");
      }
      return deal;
    },
    async moveDealStage(agencyId: string, dealId: string, stageId: string): Promise<Deal> {
      const deal = await repository.moveDealToStage(agencyId, dealId, stageId);
      if (!deal) {
        throw new PipelineResourceNotFoundError("Oportunidad o etapa no encontrada");
      }
      return deal;
    }
  };
}

export const pipelineService = createPipelineService();
