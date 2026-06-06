import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse, getAgencyContext } from "@/lib/api";
import { sendMessageSchema } from "@/modules/inbox/inbox.schemas";
import { inboxService, InboxConversationNotFoundError } from "@/modules/inbox/inbox.service";

interface ConversationMessagesRouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, context: ConversationMessagesRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = sendMessageSchema.parse(await request.json());
    const message = await inboxService.sendMessage(context.params.id, input.content, agencyContext.agencyId, agencyContext.userId);
    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof InboxConversationNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error, "Bad request");
  }
}
