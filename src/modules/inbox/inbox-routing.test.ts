import { beforeEach, describe, expect, it, vi } from "vitest";
import { findAgencyIdByInboundEmail, findAgencyIdByPhoneNumber } from "@/modules/inbox/inbox-routing";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agencyChannelConfig: {
      findFirst: vi.fn()
    },
    agency: {
      findFirst: vi.fn()
    }
  }
}));

import { prisma } from "@/lib/prisma";

function channelConfigResult(agencyId: string): Awaited<ReturnType<typeof prisma.agencyChannelConfig.findFirst>> {
  return {
    id: "config-1",
    agencyId,
    emailConfig: null,
    smsConfig: null,
    whatsappConfig: null,
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  };
}

function agencyResult(id: string): Awaited<ReturnType<typeof prisma.agency.findFirst>> {
  return {
    id,
    name: "Demo Agency",
    slug: "demo",
    logo: null,
    primaryColor: null,
    plan: "starter",
    createdAt: new Date("2026-01-01T00:00:00.000Z")
  };
}

describe("inbox routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.TWILIO_WHATSAPP_NUMBER;
  });

  it("finds an agency by inbound email domain config", async () => {
    vi.mocked(prisma.agencyChannelConfig.findFirst).mockResolvedValue(channelConfigResult("agency-1"));

    const agencyId = await findAgencyIdByInboundEmail("lead@ventas.example.com");

    expect(agencyId).toBe("agency-1");
    expect(prisma.agencyChannelConfig.findFirst).toHaveBeenCalledWith({
      where: {
        emailConfig: {
          path: ["inboundDomain"],
          equals: "ventas.example.com"
        }
      },
      select: { agencyId: true }
    });
  });

  it("falls back from inbound email domain to agency slug", async () => {
    vi.mocked(prisma.agencyChannelConfig.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.agency.findFirst).mockResolvedValue(agencyResult("agency-slug"));

    const agencyId = await findAgencyIdByInboundEmail("lead@demo.test");

    expect(agencyId).toBe("agency-slug");
    expect(prisma.agency.findFirst).toHaveBeenCalledWith({
      where: { slug: "demo" },
      select: { id: true }
    });
  });

  it("finds an agency by WhatsApp number without the provider prefix", async () => {
    vi.mocked(prisma.agencyChannelConfig.findFirst).mockResolvedValue(channelConfigResult("agency-whatsapp"));

    const agencyId = await findAgencyIdByPhoneNumber("whatsapp:+15550123", "whatsapp");

    expect(agencyId).toBe("agency-whatsapp");
    expect(prisma.agencyChannelConfig.findFirst).toHaveBeenCalledWith({
      where: {
        whatsappConfig: {
          path: ["phoneNumber"],
          equals: "+15550123"
        }
      },
      select: { agencyId: true }
    });
  });

  it("uses the configured global SMS fallback only when the number matches", async () => {
    process.env.TWILIO_PHONE_NUMBER = "+15550123";
    vi.mocked(prisma.agencyChannelConfig.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.agency.findFirst).mockResolvedValue(agencyResult("fallback-agency"));

    const agencyId = await findAgencyIdByPhoneNumber("+15550123", "sms");

    expect(agencyId).toBe("fallback-agency");
    expect(prisma.agency.findFirst).toHaveBeenCalledWith({ orderBy: { createdAt: "asc" }, select: { id: true } });
  });
});
