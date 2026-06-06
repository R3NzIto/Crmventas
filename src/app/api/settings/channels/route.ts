import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, getAgencyContext } from "@/lib/api";
import { channelConfigSchema } from "@/modules/inbox/inbox.schemas";
import { inboxService } from "@/modules/inbox/inbox.service";

export async function POST(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = channelConfigSchema.parse(await request.json());
    const config = await inboxService.saveChannelConfig(context.agencyId, input);
    return NextResponse.json({ data: config });
  } catch (error) {
    return apiErrorResponse(error, "Bad request");
  }
}
