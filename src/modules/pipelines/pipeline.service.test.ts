import type { Deal } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createPipelineService, PipelineResourceNotFoundError } from "@/modules/pipelines/pipeline.service";
import type { PipelineRepository } from "@/modules/pipelines/pipeline.repository";

function dealFixture(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    stageId: "stage-2",
    contactId: "contact-1",
    title: "Website package",
    value: 2500,
    closeDate: null,
    status: "open",
    ...overrides
  };
}

function repositoryMock(): PipelineRepository {
  return {
    findPipelines: vi.fn(),
    createPipeline: vi.fn(),
    updatePipeline: vi.fn(),
    deletePipeline: vi.fn(),
    findDealsByPipeline: vi.fn(),
    findDealById: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    deleteDeal: vi.fn(),
    moveDealToStage: vi.fn(),
    findStageInAgency: vi.fn()
  };
}

describe("pipeline service", () => {
  it("moves a deal to a target stage inside the same agency", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.moveDealToStage).mockResolvedValue(dealFixture({ stageId: "stage-2" }));
    const service = createPipelineService(repository);

    const moved = await service.moveDealStage("agency-1", "deal-1", "stage-2");

    expect(moved.stageId).toBe("stage-2");
    expect(repository.moveDealToStage).toHaveBeenCalledWith("agency-1", "deal-1", "stage-2");
  });

  it("rejects stage transitions when the deal or stage is outside the agency", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.moveDealToStage).mockResolvedValue(null);
    const service = createPipelineService(repository);

    await expect(service.moveDealStage("agency-1", "deal-1", "stage-foreign")).rejects.toBeInstanceOf(
      PipelineResourceNotFoundError
    );
  });

  it("updates a deal inside the same agency", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.updateDeal).mockResolvedValue(dealFixture({ title: "Updated package", value: 3200 }));
    const service = createPipelineService(repository);

    const updated = await service.updateDeal("agency-1", "deal-1", { title: "Updated package", value: 3200 });

    expect(updated.title).toBe("Updated package");
    expect(repository.updateDeal).toHaveBeenCalledWith("agency-1", "deal-1", { title: "Updated package", value: 3200 });
  });

  it("rejects deal updates outside the agency", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.updateDeal).mockResolvedValue(null);
    const service = createPipelineService(repository);

    await expect(service.updateDeal("agency-1", "deal-foreign", { title: "Blocked" })).rejects.toBeInstanceOf(
      PipelineResourceNotFoundError
    );
  });

  it("deletes a deal inside the same agency", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.deleteDeal).mockResolvedValue(dealFixture());
    const service = createPipelineService(repository);

    const deleted = await service.deleteDeal("agency-1", "deal-1");

    expect(deleted.id).toBe("deal-1");
    expect(repository.deleteDeal).toHaveBeenCalledWith("agency-1", "deal-1");
  });
});
