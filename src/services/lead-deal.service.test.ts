import type { Contact, Deal, Stage } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { ensureOpenDealForLead } from "@/services/lead-deal.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      findFirst: vi.fn()
    },
    deal: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    stage: {
      findFirst: vi.fn()
    }
  }
}));

function contactFixture(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    agencyId: "agency-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+15550123",
    tags: [],
    customFields: {},
    source: "test",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function stageFixture(overrides: Partial<Stage> = {}): Stage {
  return {
    id: "stage-1",
    pipelineId: "pipeline-1",
    name: "Nuevo",
    order: 0,
    color: "#2563eb",
    ...overrides
  };
}

function dealFixture(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    stageId: "stage-1",
    contactId: "contact-1",
    title: "Lead IA: pricing",
    value: 0,
    closeDate: null,
    status: "open",
    ...overrides
  };
}

describe("lead deal service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an open deal in the first agency pipeline stage", async () => {
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(contactFixture());
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.stage.findFirst).mockResolvedValue(stageFixture());
    vi.mocked(prisma.deal.create).mockResolvedValue(dealFixture());

    await ensureOpenDealForLead("agency-1", "contact-1", "Lead IA: pricing");

    expect(prisma.contact.findFirst).toHaveBeenCalledWith({
      where: { id: "contact-1", agencyId: "agency-1" },
      select: { id: true }
    });
    expect(prisma.stage.findFirst).toHaveBeenCalledWith({
      where: { pipeline: { agencyId: "agency-1" } },
      orderBy: [{ pipeline: { createdAt: "asc" } }, { order: "asc" }],
      select: { id: true }
    });
    expect(prisma.deal.create).toHaveBeenCalledWith({
      data: {
        stageId: "stage-1",
        contactId: "contact-1",
        title: "Lead IA: pricing",
        value: 0,
        status: "open"
      }
    });
  });

  it("does not create duplicate open deals inside the agency", async () => {
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(contactFixture());
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(dealFixture());

    await ensureOpenDealForLead("agency-1", "contact-1", "Lead IA: pricing");

    expect(prisma.stage.findFirst).not.toHaveBeenCalled();
    expect(prisma.deal.create).not.toHaveBeenCalled();
  });

  it("does not create a deal when the contact is outside the agency", async () => {
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null);

    await ensureOpenDealForLead("agency-1", "contact-1", "Lead IA: pricing");

    expect(prisma.deal.findFirst).not.toHaveBeenCalled();
    expect(prisma.deal.create).not.toHaveBeenCalled();
  });
});
