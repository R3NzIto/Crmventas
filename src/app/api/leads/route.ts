import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { leadFiltersSchema } from "@/modules/leads/lead.schemas";
import { leadAiService } from "@/modules/leads/lead-ai.service";

export async function GET(request: NextRequest) {
  const context = await getAgencyContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filters = leadFiltersSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const leads = await leadAiService.listLeads(context.agencyId, filters);
  return NextResponse.json({ data: leads });
}
