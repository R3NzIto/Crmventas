import { NextResponse, type NextRequest } from "next/server";
import { validateTwilioSignature } from "@/lib/providers/twilio";
import { inboxProcessingQueuePort } from "@/modules/inbox/inbox-processing.queue";

function formDataToRecord(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      params[key] = value;
    }
  });
  return params;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params = formDataToRecord(formData);
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    const valid = authToken
      ? validateTwilioSignature(authToken, request.headers.get("X-Twilio-Signature"), request.url, params)
      : true;

    if (valid) {
      await inboxProcessingQueuePort.add("inbound", {
        type: "whatsapp",
        from: params.From ?? "",
        to: params.To ?? "",
        body: params.Body ?? "",
        mediaUrl: params.MediaUrl0
      });
    } else {
      console.error("Invalid Twilio WhatsApp signature");
    }
  } catch (error) {
    console.error("Twilio WhatsApp inbound webhook enqueue failed", error);
  }

  return NextResponse.json({ received: true });
}
