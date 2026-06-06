import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse, getAgencyContext } from "@/lib/api";
import { patchConversationSchema } from "@/modules/inbox/inbox.schemas";
import { inboxService, InboxConversationNotFoundError } from "@/modules/inbox/inbox.service";

interface ConversationRouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: ConversationRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const conversation = await inboxService.getConversationById(context.params.id, agencyContext.agencyId);
    return NextResponse.json({ data: conversation });
  } catch (error) {
    if (error instanceof InboxConversationNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: ConversationRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = patchConversationSchema.parse(await request.json());
    if (input.action === "mark_as_read") {
      return NextResponse.json({ data: await inboxService.markAsRead(context.params.id, agencyContext.agencyId) });
    }
    if (input.action === "close") {
      return NextResponse.json({ data: await inboxService.closeConversation(context.params.id, agencyContext.agencyId) });
    }
    if (input.action === "reopen") {
      return NextResponse.json({ data: await inboxService.reopenConversation(context.params.id, agencyContext.agencyId) });
    }
    if (input.action === "snooze") {
      return NextResponse.json({ data: await inboxService.snoozeConversation(context.params.id, agencyContext.agencyId) });
    }
    if (input.action === "create_deal") {
      return NextResponse.json({ data: await inboxService.createDealFromConversation(context.params.id, agencyContext.agencyId) });
    }
    if (input.action === "mark_hot_lead") {
      return NextResponse.json({ data: await inboxService.markHotLead(context.params.id, agencyContext.agencyId) });
    }
    if (!input.assignedUserId) {
      return NextResponse.json({ error: "assignedUserId is required" }, { status: 400 });
    }
    return NextResponse.json({ data: await inboxService.assignConversation(context.params.id, input.assignedUserId, agencyContext.agencyId) });
  } catch (error) {
    if (error instanceof InboxConversationNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error, "Bad request");
  }
}
