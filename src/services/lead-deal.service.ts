import { prisma } from "@/lib/prisma";

export async function ensureOpenDealForLead(agencyId: string, contactId: string, title: string): Promise<void> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, agencyId },
    select: { id: true }
  });
  if (!contact) {
    return;
  }

  const existingDeal = await prisma.deal.findFirst({
    where: {
      contactId: contact.id,
      status: "open",
      contact: { agencyId }
    },
    select: { id: true }
  });
  if (existingDeal) {
    return;
  }

  const stage = await prisma.stage.findFirst({
    where: { pipeline: { agencyId } },
    orderBy: [{ pipeline: { createdAt: "asc" } }, { order: "asc" }],
    select: { id: true }
  });
  if (!stage) {
    return;
  }

  await prisma.deal.create({
    data: {
      stageId: stage.id,
      contactId: contact.id,
      title,
      value: 0,
      status: "open"
    }
  });
}
