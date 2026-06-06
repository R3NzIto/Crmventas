import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInboundWebhookService, InvalidInboundWebhookPayloadError } from "@/services/inbound-webhook.service";

vi.mock("@/lib/providers/twilio", () => ({
  validateTwilioSignature: vi.fn()
}));

import { validateTwilioSignature } from "@/lib/providers/twilio";

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("inbound webhook service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VALIDATE_SIGNATURE;
  });

  it("enqueues a valid SMS payload when signature validation is disabled", async () => {
    process.env.TWILIO_VALIDATE_SIGNATURE = "false";
    const queue = { add: vi.fn().mockResolvedValue({ id: "job-1" }) };
    const service = createInboundWebhookService(queue);

    const result = await service.handleSms(
      formData({ From: "+155501", To: "+155502", Body: "Necesito precio" }),
      "https://example.com/webhook",
      null
    );

    expect(result).toEqual({ received: true, enqueued: true });
    expect(queue.add).toHaveBeenCalledWith("inbound", {
      type: "sms",
      from: "+155501",
      to: "+155502",
      body: "Necesito precio"
    });
  });

  it("does not enqueue Twilio payloads with invalid signatures", async () => {
    process.env.TWILIO_AUTH_TOKEN = "secret";
    vi.mocked(validateTwilioSignature).mockReturnValue(false);
    const queue = { add: vi.fn() };
    const service = createInboundWebhookService(queue);

    const result = await service.handleWhatsapp(
      formData({ From: "whatsapp:+155501", To: "whatsapp:+155502", Body: "Hola" }),
      "https://example.com/webhook",
      "bad-signature"
    );

    expect(result).toEqual({ received: true, enqueued: false, error: "Invalid Twilio signature" });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("does not enqueue Twilio payloads when signature validation is enabled without an auth token", async () => {
    const queue = { add: vi.fn() };
    const service = createInboundWebhookService(queue);

    const result = await service.handleSms(
      formData({ From: "+155501", To: "+155502", Body: "Necesito precio" }),
      "https://example.com/webhook",
      null
    );

    expect(result).toEqual({ received: true, enqueued: false, error: "Invalid Twilio signature" });
    expect(validateTwilioSignature).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("rejects incomplete SMS payloads", async () => {
    process.env.TWILIO_VALIDATE_SIGNATURE = "false";
    const service = createInboundWebhookService({ add: vi.fn() });

    await expect(service.handleSms(formData({ From: "+155501", To: "+155502" }), "https://example.com/webhook", null)).rejects.toThrow();
  });

  it("enqueues email payloads with text content", async () => {
    const queue = { add: vi.fn().mockResolvedValue({ id: "job-1" }) };
    const service = createInboundWebhookService(queue);

    await service.handleEmail(
      formData({
        from: "lead@example.com",
        to: "ventas@demo.test",
        subject: "Demo",
        text: "Quiero una demo"
      })
    );

    expect(queue.add).toHaveBeenCalledWith("inbound", {
      type: "email",
      from: "lead@example.com",
      to: "ventas@demo.test",
      subject: "Demo",
      text: "Quiero una demo",
      html: undefined
    });
  });

  it("rejects email payloads without text or html content", async () => {
    const service = createInboundWebhookService({ add: vi.fn() });

    await expect(service.handleEmail(formData({ from: "lead@example.com", to: "ventas@demo.test" }))).rejects.toThrow(
      InvalidInboundWebhookPayloadError
    );
  });
});
