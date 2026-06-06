import { beforeEach, describe, expect, it, vi } from "vitest";
import { workflowRepository } from "@/modules/workflows/workflow.repository";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    deal: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    stage: {
      findFirst: vi.fn()
    },
    workflow: {
      findMany: vi.fn()
    },
    workflowExecution: {
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

import { prisma } from "@/lib/prisma";

describe("workflow repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a tag only to a contact in the current agency", async () => {
    vi.mocked(prisma.contact.findFirst).mockResolvedValue({
      tags: ["lead"]
    } as Awaited<ReturnType<typeof prisma.contact.findFirst>>);

    await workflowRepository.addTag("agency-1", "contact-1", "hot-lead");

    expect(prisma.contact.findFirst).toHaveBeenCalledWith({
      where: { id: "contact-1", agencyId: "agency-1" },
      select: { tags: true }
    });
    expect(prisma.contact.update).toHaveBeenCalledWith({
      where: { id: "contact-1" },
      data: { tags: ["lead", "hot-lead"] }
    });
  });

  it("does not add a tag when the contact is outside the agency scope", async () => {
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

    await workflowRepository.addTag("agency-1", "foreign-contact", "hot-lead");

    expect(prisma.contact.update).not.toHaveBeenCalled();
  });

  it("moves only an open deal whose contact and target stage belong to the agency", async () => {
    vi.mocked(prisma.stage.findFirst).mockResolvedValue({
      id: "stage-1"
    } as Awaited<ReturnType<typeof prisma.stage.findFirst>>);
    vi.mocked(prisma.deal.findFirst).mockResolvedValue({
      id: "deal-1"
    } as Awaited<ReturnType<typeof prisma.deal.findFirst>>);

    await workflowRepository.moveOpenDeal("agency-1", "contact-1", "stage-1");

    expect(prisma.stage.findFirst).toHaveBeenCalledWith({
      where: { id: "stage-1", pipeline: { agencyId: "agency-1" } },
      select: { id: true }
    });
    expect(prisma.deal.findFirst).toHaveBeenCalledWith({
      where: { contactId: "contact-1", status: "open", contact: { agencyId: "agency-1" } },
      select: { id: true }
    });
    expect(prisma.deal.update).toHaveBeenCalledWith({
      where: { id: "deal-1" },
      data: { stageId: "stage-1" }
    });
  });

  it("does not move a deal to a stage outside the agency scope", async () => {
    vi.mocked(prisma.stage.findFirst).mockResolvedValue(null);

    await workflowRepository.moveOpenDeal("agency-1", "contact-1", "foreign-stage");

    expect(prisma.deal.findFirst).not.toHaveBeenCalled();
    expect(prisma.deal.update).not.toHaveBeenCalled();
  });
});
