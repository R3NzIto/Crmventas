import type { Conversation, Contact, Message } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createInboxService, type InboxProviderPort } from "@/modules/inbox/inbox.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    message: {
      create: vi.fn(),
      updateMany: vi.fn()
    },
    user: {
      findFirst: vi.fn()
    },
    contact: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    deal: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    stage: {
      findFirst: vi.fn()
    },
    agencyChannelConfig: {
      upsert: vi.fn()
    }
  }
}));

vi.mock("@/modules/workflows/workflow.engine", () => ({
  workflowEngine: {
    handleTrigger: vi.fn()
  }
}));

import { prisma } from "@/lib/prisma";

function providersMock(): InboxProviderPort {
  return {
    sendEmail: vi.fn(),
    sendSMS: vi.fn(),
    sendWhatsApp: vi.fn()
  };
}

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
    channel: "sms",
    lastMessageAt: null,
    status: "OPEN",
    assignedToId: null,
    unreadCount: 0,
    ...overrides
  };
}

function messageFixture(overrides: Partial<Message> = {}): Message {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    direction: "outbound",
    content: "Hello",
    status: "sent",
    sentAt: new Date("2026-01-01T00:00:00.000Z"),
    metadata: null,
    readAt: null,
    ...overrides
  };
}

describe("inbox service", () => {
  it("lists conversations with agency-scoped filters", async () => {
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);
    const service = createInboxService(providersMock());

    await service.getConversations("agency-1", { channel: "sms", status: "OPEN", page: 1, pageSize: 25 });

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ agencyId: "agency-1", channel: "sms", status: "OPEN" }),
        include: expect.objectContaining({
          contact: expect.objectContaining({
            include: expect.objectContaining({
              deals: expect.objectContaining({
                where: { status: "open" }
              })
            })
          })
        })
      })
    );
  });

  it("sends outbound SMS through the provider and persists the message", async () => {
    const providers = providersMock();
    const conversationWithContact = { ...conversationFixture(), contact: contactFixture() } as unknown as Conversation;
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(conversationWithContact);
    vi.mocked(prisma.message.create).mockResolvedValue(messageFixture());
    vi.mocked(prisma.conversation.update).mockResolvedValue(conversationFixture());
    const service = createInboxService(providers);

    const message = await service.sendMessage("conversation-1", "Hello", "agency-1", "user-1");

    expect(message.status).toBe("sent");
    expect(providers.sendSMS).toHaveBeenCalledWith("+15550123", "Hello", "agency-1");
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: "conversation-1",
          direction: "outbound",
          content: "Hello"
        })
      })
    );
  });

  it("marks inbound messages as read inside the agency scope", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(conversationFixture());
    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.conversation.update).mockResolvedValue(conversationFixture());
    const service = createInboxService(providersMock());

    await service.markAsRead("conversation-1", "agency-1");

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith({ where: { id: "conversation-1", agencyId: "agency-1" }, select: { id: true } });
    expect(prisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { conversationId: "conversation-1", direction: "inbound", readAt: null } })
    );
  });

  it("snoozes a conversation inside the agency scope", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(conversationFixture());
    vi.mocked(prisma.conversation.update).mockResolvedValue(conversationFixture({ status: "SNOOZED" }));
    const service = createInboxService(providersMock());

    const conversation = await service.snoozeConversation("conversation-1", "agency-1");

    expect(conversation.status).toBe("SNOOZED");
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith({ where: { id: "conversation-1", agencyId: "agency-1" }, select: { id: true } });
    expect(prisma.conversation.update).toHaveBeenCalledWith({ where: { id: "conversation-1" }, data: { status: "SNOOZED" } });
  });

  it("creates a deal from an inbox conversation scoped to the agency", async () => {
    vi.mocked(prisma.conversation.findFirst)
      .mockResolvedValueOnce({ id: "conversation-1", contactId: "contact-1", contact: contactFixture() } as unknown as Conversation)
      .mockResolvedValueOnce({ ...conversationFixture(), contact: { ...contactFixture(), deals: [] }, assignedTo: null, messages: [], leadQualifications: [] } as unknown as Conversation);
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(contactFixture());
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.stage.findFirst).mockResolvedValue({ id: "stage-1", pipelineId: "pipeline-1", name: "Nuevo", order: 0, color: null });
    vi.mocked(prisma.deal.create).mockResolvedValue({
      id: "deal-1",
      stageId: "stage-1",
      contactId: "contact-1",
      title: "Lead manual: Ada Lovelace",
      value: 0,
      closeDate: null,
      status: "open"
    });
    const service = createInboxService(providersMock());

    await service.createDealFromConversation("conversation-1", "agency-1");

    expect(prisma.contact.findFirst).toHaveBeenCalledWith({ where: { id: "contact-1", agencyId: "agency-1" }, select: { id: true } });
    expect(prisma.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactId: "contact-1",
          title: "Lead manual: Ada Lovelace"
        })
      })
    );
  });

  it("marks a conversation contact as hot lead without duplicating tags", async () => {
    vi.mocked(prisma.conversation.findFirst)
      .mockResolvedValueOnce({ contactId: "contact-1", contact: { tags: ["ai-lead"] } } as unknown as Conversation)
      .mockResolvedValueOnce({ ...conversationFixture(), contact: { ...contactFixture({ tags: ["ai-lead", "hot-lead"] }), deals: [] }, assignedTo: null, messages: [], leadQualifications: [] } as unknown as Conversation);
    vi.mocked(prisma.contact.update).mockResolvedValue(contactFixture({ tags: ["ai-lead", "hot-lead"] }));
    const service = createInboxService(providersMock());

    await service.markHotLead("conversation-1", "agency-1");

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conversation-1", agencyId: "agency-1" }
      })
    );
    expect(prisma.contact.update).toHaveBeenCalledWith({
      where: { id: "contact-1" },
      data: { tags: ["ai-lead", "hot-lead"] }
    });
  });
});
