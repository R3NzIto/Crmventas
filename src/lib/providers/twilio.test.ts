import { beforeEach, describe, expect, it, vi } from "vitest";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { getAgencyEnv } from "@/lib/providers/provider-config";
import { sendSMS, sendWhatsApp, validateTwilioSignature } from "@/lib/providers/twilio";

const mocks = vi.hoisted(() => ({
  messageCreate: vi.fn(),
  twilioClient: vi.fn(),
  validateRequest: vi.fn(),
  getAgencyEnv: vi.fn(),
  agencyChannelConfigFindUnique: vi.fn(),
  decryptSecret: vi.fn((value: string) => value)
}));

vi.mock("twilio", () => {
  const client = Object.assign(mocks.twilioClient, {
    validateRequest: mocks.validateRequest
  });
  return { default: client };
});

vi.mock("@/lib/providers/provider-config", () => ({
  getAgencyEnv: mocks.getAgencyEnv
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agencyChannelConfig: {
      findUnique: mocks.agencyChannelConfigFindUnique
    }
  }
}));

vi.mock("@/lib/encryption", () => ({
  decryptSecret: mocks.decryptSecret
}));

describe("twilio provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.twilioClient.mockReturnValue({ messages: { create: mocks.messageCreate } });
    mocks.messageCreate.mockResolvedValue({ sid: "message-1" });
    vi.mocked(prisma.agencyChannelConfig.findUnique).mockResolvedValue(null);
  });

  it("sends SMS using agency-scoped Twilio credentials", async () => {
    vi.mocked(getAgencyEnv)
      .mockResolvedValueOnce("AC_agency")
      .mockResolvedValueOnce("token-agency")
      .mockResolvedValueOnce("+15550001111")
      .mockResolvedValueOnce("+15550002222");

    await sendSMS("+15559990000", "Hola", "agency-1");

    expect(getAgencyEnv).toHaveBeenCalledWith("agency-1", "TWILIO_ACCOUNT_SID", "TWILIO_ACCOUNT_SID");
    expect(getAgencyEnv).toHaveBeenCalledWith("agency-1", "TWILIO_AUTH_TOKEN", "TWILIO_AUTH_TOKEN");
    expect(getAgencyEnv).toHaveBeenCalledWith("agency-1", "TWILIO_PHONE_NUMBER", "TWILIO_PHONE_NUMBER");
    expect(twilio).toHaveBeenCalledWith("AC_agency", "token-agency");
    expect(mocks.messageCreate).toHaveBeenCalledWith({
      to: "+15559990000",
      from: "+15550001111",
      body: "Hola"
    });
  });

  it("sends WhatsApp messages with whatsapp prefixes and agency-specific sender", async () => {
    vi.mocked(getAgencyEnv)
      .mockResolvedValueOnce("AC_agency")
      .mockResolvedValueOnce("token-agency")
      .mockResolvedValueOnce("+15550001111")
      .mockResolvedValueOnce("+15550002222");

    await sendWhatsApp("+15559990000", "Hola por WhatsApp", "agency-1");

    expect(getAgencyEnv).toHaveBeenCalledWith("agency-1", "TWILIO_WHATSAPP_NUMBER", "TWILIO_WHATSAPP_NUMBER");
    expect(mocks.messageCreate).toHaveBeenCalledWith({
      to: "whatsapp:+15559990000",
      from: "whatsapp:+15550002222",
      body: "Hola por WhatsApp"
    });
  });

  it("prefers stored WhatsApp channel configuration over environment fallback", async () => {
    vi.mocked(prisma.agencyChannelConfig.findUnique).mockResolvedValue({
      smsConfig: {
        accountSid: "encrypted-sms-sid",
        authToken: "encrypted-sms-token",
        phoneNumber: "+15550001111"
      },
      whatsappConfig: {
        accountSid: "encrypted-whatsapp-sid",
        authToken: "encrypted-whatsapp-token",
        phoneNumber: "+15550003333"
      }
    } as unknown as Awaited<ReturnType<typeof prisma.agencyChannelConfig.findUnique>>);
    mocks.decryptSecret.mockImplementation((value: string) => value.replace("encrypted-", ""));

    await sendWhatsApp("+15559990000", "Hola", "agency-1");

    expect(prisma.agencyChannelConfig.findUnique).toHaveBeenCalledWith({
      where: { agencyId: "agency-1" },
      select: { smsConfig: true, whatsappConfig: true }
    });
    expect(twilio).toHaveBeenCalledWith("whatsapp-sid", "whatsapp-token");
    expect(mocks.messageCreate).toHaveBeenCalledWith({
      to: "whatsapp:+15559990000",
      from: "whatsapp:+15550003333",
      body: "Hola"
    });
    expect(getAgencyEnv).not.toHaveBeenCalled();
  });

  it("uses the SMS number as WhatsApp sender fallback", async () => {
    vi.mocked(getAgencyEnv)
      .mockResolvedValueOnce("AC_agency")
      .mockResolvedValueOnce("token-agency")
      .mockResolvedValueOnce("+15550001111")
      .mockResolvedValueOnce(undefined);

    await sendWhatsApp("whatsapp:+15559990000", "Hola", "agency-1");

    expect(mocks.messageCreate).toHaveBeenCalledWith({
      to: "whatsapp:+15559990000",
      from: "whatsapp:+15550001111",
      body: "Hola"
    });
  });

  it("validates Twilio signatures through the SDK", () => {
    mocks.validateRequest.mockReturnValue(true);

    const valid = validateTwilioSignature("token", "signature", "https://example.com/api/webhooks/whatsapp/inbound", { Body: "Hola" });

    expect(valid).toBe(true);
    expect(mocks.validateRequest).toHaveBeenCalledWith("token", "signature", "https://example.com/api/webhooks/whatsapp/inbound", { Body: "Hola" });
  });
});
