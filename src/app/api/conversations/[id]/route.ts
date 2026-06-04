import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
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
    const status = error instanceof InboxConversationNotFoundError ? 404 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
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
    if (!input.assignedUserId) {
      return NextResponse.json({ error: "assignedUserId is required" }, { status: 400 });
    }
    return NextResponse.json({ data: await inboxService.assignConversation(context.params.id, input.assignedUserId, agencyContext.agencyId) });
  } catch (error) {
    const status = error instanceof InboxConversationNotFoundError ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}
