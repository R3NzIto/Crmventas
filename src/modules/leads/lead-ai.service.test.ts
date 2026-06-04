import type { Contact, Conversation, LeadQualification, Message } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
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
      update: vi.fn()
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

describe("lead ai service", () => {
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
    process.env.OPENAI_API_KEY = originalKey;
  });
});
