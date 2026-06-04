import type { Workflow } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createWorkflowAdminService, WorkflowAdminNotFoundError } from "@/modules/workflows/workflow-admin.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflow: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@/lib/prisma";

function workflowFixture(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: "workflow-1",
    agencyId: "agency-1",
    name: "Tag new contacts",
    trigger: { type: "contact_created" },
    steps: [{ type: "add_tag", tag: "new-lead" }],
    isActive: true,
    ...overrides
  };
}

describe("workflow admin service", () => {
  it("lists workflows scoped by agency", async () => {
    vi.mocked(prisma.workflow.findMany).mockResolvedValue([workflowFixture()]);
    const service = createWorkflowAdminService();

    await service.listWorkflows("agency-1");

    expect(prisma.workflow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agencyId: "agency-1" }
      })
    );
  });

  it("creates a workflow for the current agency", async () => {
    vi.mocked(prisma.workflow.create).mockResolvedValue(workflowFixture());
    const service = createWorkflowAdminService();

    await service.createWorkflow("agency-1", {
      name: "Tag new contacts",
      trigger: { type: "contact_created" },
      steps: [{ type: "add_tag", tag: "new-lead" }],
      isActive: true
    });

    expect(prisma.workflow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: "agency-1",
          name: "Tag new contacts"
        })
      })
    );
  });

  it("throws when updating a workflow outside the agency scope", async () => {
    vi.mocked(prisma.workflow.findFirst).mockResolvedValue(null);
    const service = createWorkflowAdminService();

    await expect(service.updateWorkflow("agency-1", "workflow-foreign", { isActive: false })).rejects.toBeInstanceOf(
      WorkflowAdminNotFoundError
    );
  });
});
