import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { updateDealSchema } from "@/modules/pipelines/pipeline.schemas";
import { pipelineService, PipelineResourceNotFoundError } from "@/modules/pipelines/pipeline.service";

interface DealRouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: DealRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = updateDealSchema.parse(await request.json());
    const deal = await pipelineService.updateDeal(agencyContext.agencyId, context.params.id, input);
    return NextResponse.json({ data: deal });
  } catch (error) {
    const status = error instanceof PipelineResourceNotFoundError ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}

export async function DELETE(request: NextRequest, context: DealRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const deal = await pipelineService.deleteDeal(agencyContext.agencyId, context.params.id);
    return NextResponse.json({ data: deal });
  } catch (error) {
    const status = error instanceof PipelineResourceNotFoundError ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}
