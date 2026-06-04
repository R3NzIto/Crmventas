import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { moveDealStageSchema } from "@/modules/pipelines/pipeline.schemas";
import { pipelineService, PipelineResourceNotFoundError } from "@/modules/pipelines/pipeline.service";

interface DealStageRouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: DealStageRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = moveDealStageSchema.parse(await request.json());
    const deal = await pipelineService.moveDealStage(agencyContext.agencyId, context.params.id, input.stageId);
    return NextResponse.json({ data: deal });
  } catch (error) {
    const status = error instanceof PipelineResourceNotFoundError ? 404 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}
