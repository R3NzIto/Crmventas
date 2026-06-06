import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse, getAgencyContext } from "@/lib/api";
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
    if (error instanceof PipelineResourceNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error, "Bad request");
  }
}
