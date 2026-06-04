import twilio from "twilio";
import { getAgencyEnv } from "@/lib/providers/provider-config";

interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsappNumber: string;
}

async function getTwilioCredentials(agencyId: string): Promise<TwilioCredentials> {
  const accountSid = await getAgencyEnv(agencyId, "TWILIO_ACCOUNT_SID", "TWILIO_ACCOUNT_SID");
  const authToken = await getAgencyEnv(agencyId, "TWILIO_AUTH_TOKEN", "TWILIO_AUTH_TOKEN");
  const phoneNumber = (await getAgencyEnv(agencyId, "TWILIO_PHONE", "TWILIO_PHONE_NUMBER")) ?? "";
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER ?? phoneNumber;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error("Twilio credentials are not configured");
  }

  return { accountSid, authToken, phoneNumber, whatsappNumber };
}

export async function sendSMS(to: string, body: string, agencyId: string): Promise<void> {
  const credentials = await getTwilioCredentials(agencyId);
  const client = twilio(credentials.accountSid, credentials.authToken);
  await client.messages.create({
    to,
    from: credentials.phoneNumber,
    body
  });
}

export async function sendWhatsApp(to: string, body: string, agencyId: string): Promise<void> {
  const credentials = await getTwilioCredentials(agencyId);
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
