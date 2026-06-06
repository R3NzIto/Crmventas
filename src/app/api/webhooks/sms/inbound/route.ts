import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api";
import { inboundWebhookService } from "@/services/inbound-webhook.service";

export async function POST(request: NextRequest) {
  try {
    const result = await inboundWebhookService.handleSms(
      await request.formData(),
      request.url,
      request.headers.get("X-Twilio-Signature")
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Twilio SMS inbound webhook enqueue failed", error);
    return apiErrorResponse(new ApiError("Invalid inbound SMS payload", 400));
  }
}
