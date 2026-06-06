import twilio from "twilio";
import type { Prisma } from "@prisma/client";
import { decryptSecret } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getAgencyEnv } from "@/lib/providers/provider-config";

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber: string;
}

interface TwilioChannelConfig {
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}

function jsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value;
}

function jsonString(value: Prisma.JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function parseTwilioConfig(value: Prisma.JsonValue | null | undefined): TwilioChannelConfig {
  const config = jsonObject(value);
  const accountSid = jsonString(config.accountSid);
  const authToken = jsonString(config.authToken);
  return {
    accountSid: accountSid ? decryptSecret(accountSid) : undefined,
    authToken: authToken ? decryptSecret(authToken) : undefined,
    phoneNumber: jsonString(config.phoneNumber)
  };
}

async function getStoredTwilioConfig(agencyId: string): Promise<{ sms: TwilioChannelConfig; whatsapp: TwilioChannelConfig }> {
  const config = await prisma.agencyChannelConfig.findUnique({
    where: { agencyId },
    select: {
      smsConfig: true,
      whatsappConfig: true
    }
  });
  return {
    sms: parseTwilioConfig(config?.smsConfig),
    whatsapp: parseTwilioConfig(config?.whatsappConfig)
  };
}

async function getTwilioCredentials(agencyId: string, channel: "sms" | "whatsapp"): Promise<TwilioCredentials> {
  const stored = await getStoredTwilioConfig(agencyId);
  const channelConfig = channel === "whatsapp" ? stored.whatsapp : stored.sms;
  const accountSid = channelConfig.accountSid ?? stored.sms.accountSid ?? (await getAgencyEnv(agencyId, "TWILIO_ACCOUNT_SID", "TWILIO_ACCOUNT_SID"));
  const authToken = channelConfig.authToken ?? stored.sms.authToken ?? (await getAgencyEnv(agencyId, "TWILIO_AUTH_TOKEN", "TWILIO_AUTH_TOKEN"));
  const phoneNumber = stored.sms.phoneNumber ?? (await getAgencyEnv(agencyId, "TWILIO_PHONE_NUMBER", "TWILIO_PHONE_NUMBER")) ?? "";
  const whatsappNumber =
    stored.whatsapp.phoneNumber ?? (await getAgencyEnv(agencyId, "TWILIO_WHATSAPP_NUMBER", "TWILIO_WHATSAPP_NUMBER")) ?? phoneNumber;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error("Twilio credentials are not configured");
  }

  return { accountSid, authToken, phoneNumber, whatsappNumber };
}

export async function sendSMS(to: string, body: string, agencyId: string): Promise<void> {
  const credentials = await getTwilioCredentials(agencyId, "sms");
  const client = twilio(credentials.accountSid, credentials.authToken);
  await client.messages.create({
    to,
    from: credentials.phoneNumber,
    body
  });
}

export async function sendWhatsApp(to: string, body: string, agencyId: string): Promise<void> {
  const credentials = await getTwilioCredentials(agencyId, "whatsapp");
  const client = twilio(credentials.accountSid, credentials.authToken);
  await client.messages.create({
    to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    from: credentials.whatsappNumber.startsWith("whatsapp:") ? credentials.whatsappNumber : `whatsapp:${credentials.whatsappNumber}`,
    body
  });
}

export function validateTwilioSignature(authToken: string, signature: string | null, url: string, params: Record<string, string>): boolean {
  if (!signature) {
    return false;
  }
  return twilio.validateRequest(authToken, signature, url, params);
}
