import { prisma } from "@/lib/prisma";

export interface DashboardMetricCard {
  label: string;
  value: string;
  helper: string;
}

export interface DashboardRecentLead {
  id: string;
  contactName: string;
  score: number;
  intent: string;
  urgency: string;
  recommendedAction: string;
}

export interface DashboardRecentConversation {
  id: string;
  contactName: string;
  channel: string;
  unreadCount: number;
  lastMessageAt: Date | null;
  lastMessage: string;
}

export interface DashboardPipelineStage {
  id: string;
  name: string;
  dealCount: number;
  value: number;
}

export interface DashboardMetrics {
  cards: DashboardMetricCard[];
  pipelineStages: DashboardPipelineStage[];
  recentLeads: DashboardRecentLead[];
  recentConversations: DashboardRecentConversation[];
}

function contactName(contact: { firstName: string; lastName: string; email: string | null; phone: string | null }): string {
  return `${contact.firstName} ${contact.lastName}`.trim() || contact.email || contact.phone || "Contacto sin nombre";
}

function currency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export async function getDashboardMetrics(agencyId: string): Promise<DashboardMetrics> {
  const [contactCount, openDeals, unreadConversations, hotLeadCount, pipeline, recentLeads, recentConversations] = await Promise.all([
    prisma.contact.count({ where: { agencyId } }),
    prisma.deal.findMany({
      where: { status: "open", contact: { agencyId } },
      select: { value: true }
    }),
    prisma.conversation.count({
      where: { agencyId, unreadCount: { gt: 0 } }
    }),
    prisma.leadQualification.count({
      where: { agencyId, isLead: true, leadScore: { gte: 80 } }
    }),
    prisma.pipeline.findFirst({
      where: { agencyId },
      orderBy: { createdAt: "asc" },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            deals: {
              where: { status: "open", contact: { agencyId } },
              select: { value: true }
            }
          }
        }
      }
    }),
    prisma.leadQualification.findMany({
      where: { agencyId, isLead: true },
      orderBy: [{ leadScore: "desc" }, { createdAt: "desc" }],
      take: 4,
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    }),
    prisma.conversation.findMany({
      where: { agencyId },
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
      take: 4,
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
          select: { content: true }
        }
      }
    })
  ]);

  const openDealCount = openDeals.length;
  const pipelineValue = openDeals.reduce((total, deal) => total + deal.value, 0);

  return {
    cards: [
      { label: "Contactos", value: String(contactCount), helper: "Base total del workspace" },
      { label: "Deals abiertos", value: String(openDealCount), helper: currency(pipelineValue) },
      { label: "Inbox sin leer", value: String(unreadConversations), helper: "Conversaciones con respuesta pendiente" },
      { label: "Leads calientes", value: String(hotLeadCount), helper: "Score IA de 80 o mas" }
    ],
    pipelineStages:
      pipeline?.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        dealCount: stage.deals.length,
        value: stage.deals.reduce((total, deal) => total + deal.value, 0)
      })) ?? [],
    recentLeads: recentLeads.map((lead) => ({
      id: lead.id,
      contactName: contactName(lead.contact),
      score: lead.leadScore,
      intent: lead.intent,
      urgency: lead.urgency,
      recommendedAction: lead.recommendedAction
    })),
    recentConversations: recentConversations.map((conversation) => ({
      id: conversation.id,
      contactName: contactName(conversation.contact),
      channel: conversation.channel,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt,
      lastMessage: conversation.messages[0]?.content ?? "Sin mensajes todavia"
    }))
  };
}
