import type { Conversation, ConversationChannel, Message, Prisma } from "@prisma/client";
import { encryptSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/providers/sendgrid";
import { sendSMS, sendWhatsApp } from "@/lib/providers/twilio";
import { workflowEngine } from "@/modules/workflows/workflow.engine";
import type { InboxChannelConfigInput, InboxConversationFilters } from "@/modules/inbox/inbox.schemas";

export type InboxConversationWithMessages = Prisma.ConversationGetPayload<{
  include: { contact: true; assignedTo: true; messages: true; leadQualifications: true };
}>;

export interface InboxProviderPort {
  sendEmail(to: string, subject: string, html: string, agencyId: string): Promise<void>;
  sendSMS(to: string, body: string, agencyId: string): Promise<void>;
  sendWhatsApp(to: string, body: string, agencyId: string): Promise<void>;
}

const defaultProviders: InboxProviderPort = {
  sendEmail,
  sendSMS,
  sendWhatsApp
};

export class InboxConversationNotFoundError extends Error {
  constructor() {
    super("Conversacion no encontrada");
  }
}

function buildConversationWhere(agencyId: string, filters: InboxConversationFilters): Prisma.ConversationWhereInput {
  return {
    agencyId,
    ...(filters.channel ? { channel: filters.channel } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.contactId ? { contactId: filters.contactId } : {}),
    ...(filters.assignedUserId ? { assignedToId: filters.assignedUserId } : {}),
    ...(filters.search
      ? {
          OR: [
            { contact: { firstName: { contains: filters.search, mode: "insensitive" } } },
            { contact: { lastName: { contains: filters.search, mode: "insensitive" } } },
            { contact: { email: { contains: filters.search, mode: "insensitive" } } },
            { messages: { some: { content: { contains: filters.search, mode: "insensitive" } } } }
          ]
        }
      : {})
  };
}

export function createInboxService(providers: InboxProviderPort = defaultProviders) {
  return {
    async getConversations(agencyId: string, filters: InboxConversationFilters): Promise<InboxConversationWithMessages[]> {
      return prisma.conversation.findMany({
        where: buildConversationWhere(agencyId, filters),
        include: {
          contact: true,
          assignedTo: true,
          messages: {
            orderBy: { sentAt: "desc" },
            take: 1
          },
          leadQualifications: {
            where: { isLead: true },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      });
    },

    async getConversationById(id: string, agencyId: string): Promise<InboxConversationWithMessages> {
      const conversation = await prisma.conversation.findFirst({
        where: { id, agencyId },
        include: {
          contact: true,
          assignedTo: true,
          messages: { orderBy: { sentAt: "asc" } },
          leadQualifications: {
            where: { isLead: true },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });
      if (!conversation) {
        throw new InboxConversationNotFoundError();
      }
      return conversation;
    },

    async sendMessage(conversationId: string, content: string, agencyId: string, userId: string): Promise<Message> {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, agencyId },
        include: { contact: true }
      });
      if (!conversation) {
        throw new InboxConversationNotFoundError();
      }

      if (conversation.channel === "email") {
        if (!conversation.contact.email) {
          throw new Error("El contacto no tiene email");
        }
        await providers.sendEmail(conversation.contact.email, "Nuevo mensaje", content, agencyId);
      }
      if (conversation.channel === "sms") {
        if (!conversation.contact.phone) {
          throw new Error("El contacto no tiene telefono");
        }
        await providers.sendSMS(conversation.contact.phone, content, agencyId);
      }
      if (conversation.channel === "whatsapp") {
        if (!conversation.contact.phone) {
          throw new Error("El contacto no tiene telefono");
        }
        await providers.sendWhatsApp(conversation.contact.phone, content, agencyId);
      }

      const message = await prisma.message.create({
        data: {
          conversationId,
          direction: "outbound",
          content,
          status: "sent",
          sentAt: new Date(),
          metadata: { userId }
        }
      });
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.sentAt, status: "OPEN" }
      });
      return message;
    },

    async markAsRead(conversationId: string, agencyId: string): Promise<Conversation> {
      const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, agencyId }, select: { id: true } });
      if (!conversation) {
        throw new InboxConversationNotFoundError();
      }
      await prisma.message.updateMany({
        where: { conversationId, direction: "inbound", readAt: null },
        data: { readAt: new Date() }
      });
      return prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 }
      });
    },

    async closeConversation(id: string, agencyId: string): Promise<Conversation> {
      return this.updateStatus(id, agencyId, "CLOSED");
    },

    async reopenConversation(id: string, agencyId: string): Promise<Conversation> {
      return this.updateStatus(id, agencyId, "OPEN");
    },

    async updateStatus(id: string, agencyId: string, status: "OPEN" | "CLOSED" | "SNOOZED"): Promise<Conversation> {
      const conversation = await prisma.conversation.findFirst({ where: { id, agencyId }, select: { id: true } });
      if (!conversation) {
        throw new InboxConversationNotFoundError();
      }
      return prisma.conversation.update({ where: { id }, data: { status } });
    },

    async assignConversation(id: string, userId: string, agencyId: string): Promise<Conversation> {
      const conversation = await prisma.conversation.findFirst({ where: { id, agencyId }, select: { id: true } });
      const user = await prisma.user.findFirst({ where: { id: userId, agencyId }, select: { id: true } });
      if (!conversation || !user) {
        throw new InboxConversationNotFoundError();
      }
      return prisma.conversation.update({ where: { id }, data: { assignedToId: userId } });
    },

    async upsertInboundMessage(input: {
      agencyId: string;
      channel: ConversationChannel;
      from: string;
      content: string;
      metadata?: Prisma.InputJsonValue;
    }): Promise<Message> {
      let contact = await prisma.contact.findFirst({
        where:
          input.channel === "email"
            ? { agencyId: input.agencyId, email: input.from }
            : { agencyId: input.agencyId, phone: input.from }
      });
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
          agencyId: input.agencyId,
          firstName: input.from,
          lastName: "",
          email: input.channel === "email" ? input.from : undefined,
          phone: input.channel !== "email" ? input.from : undefined,
          tags: [],
          customFields: {},
          source: `${input.channel}_inbound`
          }
        });
      }

      let conversation = await prisma.conversation.findFirst({
        where: { agencyId: input.agencyId, contactId: contact.id, channel: input.channel }
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            agencyId: input.agencyId,
            contactId: contact.id,
            channel: input.channel,
            status: "OPEN",
            unreadCount: 0
          }
        });
      }

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: "inbound",
          content: input.content,
          status: "received",
          sentAt: new Date(),
          metadata: input.metadata
        }
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: message.sentAt,
          unreadCount: { increment: 1 },
          status: "OPEN"
        }
      });
      await workflowEngine.handleTrigger({
        type: "message_received",
        agencyId: input.agencyId,
        contactId: contact.id,
        conversationId: conversation.id,
        channel: input.channel,
        content: input.content
      });
      return message;
    },

    async saveChannelConfig(agencyId: string, input: InboxChannelConfigInput) {
      const data = {
        emailConfig: input.email
          ? {
              sendgridApiKey: input.email.sendgridApiKey ? encryptSecret(input.email.sendgridApiKey) : undefined,
              inboundDomain: input.email.inboundDomain
            }
          : undefined,
        smsConfig: input.sms
          ? {
              accountSid: input.sms.accountSid ? encryptSecret(input.sms.accountSid) : undefined,
              authToken: input.sms.authToken ? encryptSecret(input.sms.authToken) : undefined,
              phoneNumber: input.sms.phoneNumber
            }
          : undefined,
        whatsappConfig: input.whatsapp
          ? {
              accountSid: input.whatsapp.accountSid ? encryptSecret(input.whatsapp.accountSid) : undefined,
              authToken: input.whatsapp.authToken ? encryptSecret(input.whatsapp.authToken) : undefined,
              phoneNumber: input.whatsapp.phoneNumber
            }
          : undefined
      };
      return prisma.agencyChannelConfig.upsert({
        where: { agencyId },
        update: data,
        create: { agencyId, ...data }
      });
    }
  };
}

export const inboxService = createInboxService();
