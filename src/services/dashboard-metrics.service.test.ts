import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getDashboardMetrics } from "@/services/dashboard-metrics.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      count: vi.fn()
    },
    deal: {
      findMany: vi.fn()
    },
    conversation: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    leadQualification: {
      count: vi.fn(),
      findMany: vi.fn()
    },
    pipeline: {
      findFirst: vi.fn()
    }
  }
}));

describe("dashboard metrics service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds agency-scoped commercial metrics", async () => {
    vi.mocked(prisma.contact.count).mockResolvedValue(12);
    vi.mocked(prisma.deal.findMany).mockResolvedValue([{ value: 1000 }, { value: 2500 }] as unknown as Awaited<ReturnType<typeof prisma.deal.findMany>>);
    vi.mocked(prisma.conversation.count).mockResolvedValue(3);
    vi.mocked(prisma.leadQualification.count).mockResolvedValue(2);
    vi.mocked(prisma.pipeline.findFirst).mockResolvedValue({
      stages: [
        { id: "stage-1", name: "Nuevo", deals: [{ value: 1000 }, { value: 500 }] },
        { id: "stage-2", name: "Calificado", deals: [{ value: 2000 }] }
      ]
    } as unknown as Awaited<ReturnType<typeof prisma.pipeline.findFirst>>);
    vi.mocked(prisma.leadQualification.findMany).mockResolvedValue([
      {
        id: "lead-1",
        leadScore: 88,
        intent: "pricing",
        urgency: "medium",
        recommendedAction: "Responder con precio",
        contact: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: null }
      }
    ] as unknown as Awaited<ReturnType<typeof prisma.leadQualification.findMany>>);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        id: "conversation-1",
        channel: "whatsapp",
        unreadCount: 1,
        lastMessageAt: new Date("2026-06-04T12:00:00.000Z"),
        contact: { firstName: "Grace", lastName: "Hopper", email: null, phone: "+15550123" },
        messages: [{ content: "Quiero una demo" }]
      }
    ] as unknown as Awaited<ReturnType<typeof prisma.conversation.findMany>>);

    const metrics = await getDashboardMetrics("agency-1");

    expect(prisma.contact.count).toHaveBeenCalledWith({ where: { agencyId: "agency-1" } });
    expect(prisma.deal.findMany).toHaveBeenCalledWith({
      where: { status: "open", contact: { agencyId: "agency-1" } },
      select: { value: true }
    });
    expect(prisma.conversation.count).toHaveBeenCalledWith({ where: { agencyId: "agency-1", unreadCount: { gt: 0 } } });
    expect(prisma.leadQualification.count).toHaveBeenCalledWith({
      where: { agencyId: "agency-1", isLead: true, leadScore: { gte: 80 } }
    });
    expect(metrics.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Contactos", value: "12" }),
        expect.objectContaining({ label: "Deals abiertos", value: "2" }),
        expect.objectContaining({ label: "Inbox sin leer", value: "3" }),
        expect.objectContaining({ label: "Leads calientes", value: "2" })
      ])
    );
    expect(metrics.pipelineStages).toEqual([
      { id: "stage-1", name: "Nuevo", dealCount: 2, value: 1500 },
      { id: "stage-2", name: "Calificado", dealCount: 1, value: 2000 }
    ]);
    expect(metrics.recentLeads[0]).toEqual(expect.objectContaining({ contactName: "Ada Lovelace", score: 88 }));
    expect(metrics.recentConversations[0]).toEqual(expect.objectContaining({ contactName: "Grace Hopper", lastMessage: "Quiero una demo" }));
  });

  it("returns empty dashboard lists when no pipeline or recent activity exists", async () => {
    vi.mocked(prisma.contact.count).mockResolvedValue(0);
    vi.mocked(prisma.deal.findMany).mockResolvedValue([]);
    vi.mocked(prisma.conversation.count).mockResolvedValue(0);
    vi.mocked(prisma.leadQualification.count).mockResolvedValue(0);
    vi.mocked(prisma.pipeline.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.leadQualification.findMany).mockResolvedValue([]);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

    const metrics = await getDashboardMetrics("agency-1");

    expect(metrics.pipelineStages).toEqual([]);
    expect(metrics.recentLeads).toEqual([]);
    expect(metrics.recentConversations).toEqual([]);
  });
});
