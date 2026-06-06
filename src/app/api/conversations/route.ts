import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, getAgencyContext } from "@/lib/api";
import { conversationFiltersSchema } from "@/modules/inbox/inbox.schemas";
import { inboxService } from "@/modules/inbox/inbox.service";

export async function GET(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const filters = conversationFiltersSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const conversations = await inboxService.getConversations(context.agencyId, filters);
    return NextResponse.json({ data: conversations });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
