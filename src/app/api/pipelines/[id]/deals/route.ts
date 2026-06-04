import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { createDealSchema } from "@/modules/pipelines/pipeline.schemas";
import { pipelineService, PipelineResourceNotFoundError } from "@/modules/pipelines/pipeline.service";

interface PipelineDealsRouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: PipelineDealsRouteContext) {
  const agencyContext = await getAgencyContext(request);
  if (!agencyContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const deals = await pipelineService.getDealsByPipeline(agencyContext.agencyId, context.params.id);
  return NextResponse.json({ data: deals });
}

export async function POST(request: NextRequest, context: PipelineDealsRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = createDealSchema.parse(await request.json());
    const deal = await pipelineService.createDeal(agencyContext.agencyId, context.params.id, input);
    return NextResponse.json({ data: deal }, { status: 201 });
  } catch (error) {
    const status = error instanceof PipelineResourceNotFoundError ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}
