import { prisma } from "@/lib/prisma";

export async function findAgencyIdByInboundEmail(to: string): Promise<string | null> {
  const domain = to.split("@")[1]?.toLowerCase();
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
  const normalized = to.replace("whatsapp:", "");
  const path = channel === "sms" ? ["phoneNumber"] : ["phoneNumber"];
  const config = await prisma.agencyChannelConfig.findFirst({
    where: {
      [channel === "sms" ? "smsConfig" : "whatsappConfig"]: {
        path,
        equals: normalized
      }
    },
    select: { agencyId: true }
  });
  if (config) {
    return config.agencyId;
  }
  const fallbackNumber = channel === "sms" ? process.env.TWILIO_PHONE_NUMBER : process.env.TWILIO_WHATSAPP_NUMBER;
  if (fallbackNumber && fallbackNumber.replace("whatsapp:", "") === normalized) {
    const agency = await prisma.agency.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
    return agency?.id ?? null;
  }
  return null;
}
