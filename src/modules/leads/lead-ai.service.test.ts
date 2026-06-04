import type { Contact, Conversation, Deal, LeadQualification, Message, Stage } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLeadAiService } from "@/modules/leads/lead-ai.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      findUnique: vi.fn()
    },
    leadQualification: {
      upsert: vi.fn(),
      findMany: vi.fn()
    },
    contact: {
      findFirst: vi.fn(),
      update: vi.fn()
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

vi.mock("@/modules/workflows/workflow.engine", () => ({
  workflowEngine: {
    handleTrigger: vi.fn()
  }
}));

import { prisma } from "@/lib/prisma";
import { workflowEngine } from "@/modules/workflows/workflow.engine";

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

function conversationFixture(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "conversation-1",
    agencyId: "agency-1",
    contactId: "contact-1",
    channel: "whatsapp",
    lastMessageAt: null,
    status: "OPEN",
    assignedToId: null,
    unreadCount: 1,
    ...overrides
  };
}

function messageFixture(overrides: Partial<Message> = {}): Message {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    direction: "inbound",
    content: "Can you send pricing for the automation package?",
    status: "received",
    sentAt: new Date("2026-01-01T00:00:00.000Z"),
    metadata: null,
    readAt: null,
    ...overrides
  };
}

function qualificationFixture(overrides: Partial<LeadQualification> = {}): LeadQualification {
  return {
    id: "qualification-1",
    agencyId: "agency-1",
    contactId: "contact-1",
    conversationId: "conversation-1",
    messageId: "message-1",
    isLead: true,
    leadScore: 88,
    intent: "pricing",
    urgency: "medium",
    summary: "Pricing request",
    recommendedAction: "Follow up",
    suggestedTags: ["ai-lead", "pricing"],
    raw: {},
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

describe("lead ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies pricing language as a lead when no OpenAI key is configured", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";
    const service = createLeadAiService();

    const result = await service.classifyText("Can you send pricing for the automation package?");

    expect(result.isLead).toBe(true);
    expect(result.intent).toBe("pricing");
    expect(result.leadScore).toBeGreaterThanOrEqual(80);
    process.env.OPENAI_API_KEY = originalKey;
  });

  it("persists qualification and fires lead_qualified workflow", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";
    const contact = contactFixture();
    const conversation = { ...conversationFixture(), contact };
    const message = { ...messageFixture(), conversation };
    vi.mocked(prisma.message.findUnique).mockResolvedValue(message as unknown as Message);
    vi.mocked(prisma.leadQualification.upsert).mockResolvedValue(qualificationFixture());
    vi.mocked(prisma.contact.update).mockResolvedValue(contact);
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(contact);
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.stage.findFirst).mockResolvedValue(stageFixture());
    vi.mocked(prisma.deal.create).mockResolvedValue(dealFixture());
    const service = createLeadAiService();

    const qualification = await service.qualifyMessage("message-1");

    expect(qualification?.leadScore).toBe(88);
    expect(prisma.leadQualification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { messageId: "message-1" },
        create: expect.objectContaining({
          agencyId: "agency-1",
          contactId: "contact-1",
          conversationId: "conversation-1"
        })
      })
    );
    expect(workflowEngine.handleTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "lead_qualified",
        agencyId: "agency-1",
        contactId: "contact-1",
        leadScore: expect.any(Number),
        intent: "pricing"
      })
    );
    expect(prisma.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactId: "contact-1",
          title: "Lead IA: pricing",
          status: "open"
        })
      })
    );
    process.env.OPENAI_API_KEY = originalKey;
  });

  it("does not create a deal or workflow for non-lead messages", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";
    const contact = contactFixture();
    const conversation = { ...conversationFixture(), contact };
    const message = { ...messageFixture({ content: "I need support with an error" }), conversation };
    vi.mocked(prisma.message.findUnique).mockResolvedValue(message as unknown as Message);
    vi.mocked(prisma.leadQualification.upsert).mockResolvedValue(qualificationFixture({ isLead: false, leadScore: 25, intent: "support" }));
    vi.mocked(prisma.contact.update).mockResolvedValue(contactFixture({ tags: ["ai-reviewed", "support"] }));
    const service = createLeadAiService();

    await service.qualifyMessage("message-1");

    expect(prisma.deal.create).not.toHaveBeenCalled();
    expect(workflowEngine.handleTrigger).not.toHaveBeenCalled();
    process.env.OPENAI_API_KEY = originalKey;
  });

  it("does not duplicate a deal when the lead contact already has an open agency deal", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "";
    const contact = contactFixture();
    const conversation = { ...conversationFixture(), contact };
    const message = { ...messageFixture(), conversation };
    vi.mocked(prisma.message.findUnique).mockResolvedValue(message as unknown as Message);
    vi.mocked(prisma.leadQualification.upsert).mockResolvedValue(qualificationFixture());
    vi.mocked(prisma.contact.update).mockResolvedValue(contact);
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(contact);
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(dealFixture());
    const service = createLeadAiService();

    await service.qualifyMessage("message-1");

    expect(prisma.stage.findFirst).not.toHaveBeenCalled();
    expect(prisma.deal.create).not.toHaveBeenCalled();
    expect(workflowEngine.handleTrigger).toHaveBeenCalledWith(expect.objectContaining({ type: "lead_qualified" }));
    process.env.OPENAI_API_KEY = originalKey;
  });
});
