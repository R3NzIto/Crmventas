import { expect, type Page } from "@playwright/test";
import { PrismaClient, type ConversationChannel } from "@prisma/client";

export const prisma = new PrismaClient();

export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", "demo@crmventas.local");
  await page.fill("#password", "Demo1234!");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/dashboard");
}

export async function demoAgencyId(): Promise<string> {
  const agency = await prisma.agency.findUnique({ where: { slug: "demo-agency" }, select: { id: true } });
  if (!agency) {
    throw new Error("Demo agency not found. Run npm run db:seed before E2E tests.");
  }
  return agency.id;
}

export async function cleanupE2eData(): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: { contains: "@e2e.local" } },
        { firstName: { startsWith: "E2E" } },
        { source: "e2e" }
      ]
    },
    select: { id: true }
  });
  const contactIds = contacts.map((contact) => contact.id);
  if (contactIds.length === 0) {
    return;
  }

  const conversations = await prisma.conversation.findMany({
    where: { contactId: { in: contactIds } },
    select: { id: true }
  });
  const conversationIds = conversations.map((conversation) => conversation.id);

  await prisma.leadQualification.deleteMany({ where: { contactId: { in: contactIds } } });
  await prisma.formSubmission.deleteMany({ where: { contactId: { in: contactIds } } });
  await prisma.deal.deleteMany({ where: { contactId: { in: contactIds } } });
  if (conversationIds.length > 0) {
    await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
  }
  await prisma.conversation.deleteMany({ where: { contactId: { in: contactIds } } });
  await prisma.contact.deleteMany({ where: { id: { in: contactIds } } });
}

export async function createInboxConversation(input: {
  agencyId: string;
  stamp: string;
  channel?: ConversationChannel;
  content?: string;
}): Promise<{ contactId: string; conversationId: string }> {
  const contact = await prisma.contact.create({
    data: {
      agencyId: input.agencyId,
      firstName: "E2EInbox",
      lastName: input.stamp,
      phone: `+1555${input.stamp.slice(-7)}`,
      tags: [],
      customFields: {},
      source: "e2e"
    }
  });
  const conversation = await prisma.conversation.create({
    data: {
      agencyId: input.agencyId,
      contactId: contact.id,
      channel: input.channel ?? "whatsapp",
      status: "OPEN",
      unreadCount: 1,
      lastMessageAt: new Date()
    }
  });
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "inbound",
      content: input.content ?? "Necesito seguimiento comercial",
      status: "received",
      sentAt: new Date()
    }
  });
  return { contactId: contact.id, conversationId: conversation.id };
}

export async function createManualDealContact(agencyId: string, stamp: string): Promise<string> {
  const contact = await prisma.contact.create({
    data: {
      agencyId,
      firstName: "E2EPipeline",
      lastName: stamp,
      email: `pipeline-${stamp}@e2e.local`,
      tags: [],
      customFields: {},
      source: "e2e"
    }
  });
  return contact.id;
}

export async function expectNoVisibleText(page: Page, text: string): Promise<void> {
  await expect(page.getByText(text)).toHaveCount(0);
}
