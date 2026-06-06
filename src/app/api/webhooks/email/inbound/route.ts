import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api";
import { inboundWebhookService } from "@/services/inbound-webhook.service";

export async function POST(request: NextRequest) {
  try {
    const result = await inboundWebhookService.handleEmail(await request.formData());
    return NextResponse.json(result);
  } catch (error) {
    console.error("SendGrid inbound webhook enqueue failed", error);
    return apiErrorResponse(new ApiError("Invalid inbound email payload", 400));
  }
}
