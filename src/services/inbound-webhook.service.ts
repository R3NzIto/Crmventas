import { validateTwilioSignature } from "@/lib/providers/twilio";
import { inboxProcessingQueuePort, type InboxInboundJob } from "@/modules/inbox/inbox-processing.queue";
import {
  inboundEmailPayloadSchema,
  inboundSmsPayloadSchema,
  inboundWhatsappPayloadSchema,
  type InboundEmailPayload,
  type InboundSmsPayload,
  type InboundWhatsappPayload
} from "@/modules/inbox/inbox.schemas";

export interface InboundWebhookQueuePort {
  add(name: "inbound", data: InboxInboundJob): Promise<unknown>;
}

export interface InboundWebhookResult {
  received: true;
  enqueued: boolean;
  error?: string;
}

export class InvalidInboundWebhookPayloadError extends Error {
  constructor(message = "Invalid inbound webhook payload") {
    super(message);
  }
}

function formDataToRecord(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      params[key] = value;
    }
  });
  return params;
}

function getFormValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

function shouldValidateTwilioSignature(): boolean {
  return process.env.TWILIO_VALIDATE_SIGNATURE !== "false";
}

function isValidTwilioRequest(authToken: string, signature: string | null, requestUrl: string, params: Record<string, string>): boolean {
  if (!shouldValidateTwilioSignature()) {
    return true;
  }
  if (!authToken) {
    return false;
  }
  return validateTwilioSignature(authToken, signature, requestUrl, params);
}

export function createInboundWebhookService(queue: InboundWebhookQueuePort = inboxProcessingQueuePort) {
  return {
    async handleSms(formData: FormData, requestUrl: string, signature: string | null): Promise<InboundWebhookResult> {
      const params = formDataToRecord(formData);
      const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
      const valid = isValidTwilioRequest(authToken, signature, requestUrl, params);

      if (!valid) {
        return { received: true, enqueued: false, error: "Invalid Twilio signature" };
      }

      const payload: InboundSmsPayload = inboundSmsPayloadSchema.parse({
        type: "sms",
        from: params.From,
        to: params.To,
        body: params.Body
      });
      await queue.add("inbound", payload);
      return { received: true, enqueued: true };
    },

    async handleWhatsapp(formData: FormData, requestUrl: string, signature: string | null): Promise<InboundWebhookResult> {
      const params = formDataToRecord(formData);
      const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
      const valid = isValidTwilioRequest(authToken, signature, requestUrl, params);

      if (!valid) {
        return { received: true, enqueued: false, error: "Invalid Twilio signature" };
      }

      const payload: InboundWhatsappPayload = inboundWhatsappPayloadSchema.parse({
        type: "whatsapp",
        from: params.From,
        to: params.To,
        body: params.Body,
        mediaUrl: params.MediaUrl0
      });
      await queue.add("inbound", payload);
      return { received: true, enqueued: true };
    },

    async handleEmail(formData: FormData): Promise<InboundWebhookResult> {
      const text = getFormValue(formData, "text");
      const html = getFormValue(formData, "html");
      if (!text && !html) {
        throw new InvalidInboundWebhookPayloadError("Inbound email requires text or html content");
      }

      const payload: InboundEmailPayload = inboundEmailPayloadSchema.parse({
        type: "email",
        from: getFormValue(formData, "from"),
        to: getFormValue(formData, "to"),
        subject: getFormValue(formData, "subject"),
        text,
        html
      });
      await queue.add("inbound", payload);
      return { received: true, enqueued: true };
    }
  };
}

export const inboundWebhookService = createInboundWebhookService();
