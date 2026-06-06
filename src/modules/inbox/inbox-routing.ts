import { prisma } from "@/lib/prisma";

function normalizePhoneNumber(value: string): string {
  return value.trim().replace(/^whatsapp:/i, "");
}

export async function findAgencyIdByInboundEmail(to: string): Promise<string | null> {
  const domain = to.trim().split("@")[1]?.toLowerCase();
  if (!domain) {
    return null;
  }
  const config = await prisma.agencyChannelConfig.findFirst({
    where: {
      emailConfig: {
        path: ["inboundDomain"],
        equals: domain
      }
    },
    select: { agencyId: true }
  });
  if (config) {
    return config.agencyId;
  }
  const agency = await prisma.agency.findFirst({
    where: { slug: domain.split(".")[0] },
    select: { id: true }
  });
  return agency?.id ?? null;
}

export async function findAgencyIdByPhoneNumber(to: string, channel: "sms" | "whatsapp"): Promise<string | null> {
  const normalized = normalizePhoneNumber(to);
  const config = await prisma.agencyChannelConfig.findFirst({
    where: {
      [channel === "sms" ? "smsConfig" : "whatsappConfig"]: {
        path: ["phoneNumber"],
        equals: normalized
      }
    },
    select: { agencyId: true }
  });
  if (config) {
    return config.agencyId;
  }
  const fallbackNumber = channel === "sms" ? process.env.TWILIO_PHONE_NUMBER : process.env.TWILIO_WHATSAPP_NUMBER;
  if (fallbackNumber && normalizePhoneNumber(fallbackNumber) === normalized) {
    const agency = await prisma.agency.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    return agency?.id ?? null;
  }
  return null;
}
