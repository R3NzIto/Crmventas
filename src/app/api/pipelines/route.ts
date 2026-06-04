import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { createPipelineSchema } from "@/modules/pipelines/pipeline.schemas";
import { pipelineService } from "@/modules/pipelines/pipeline.service";

export async function GET(request: NextRequest) {
  const context = await getAgencyContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pipelines = await pipelineService.getPipelines(context.agencyId);
  return NextResponse.json({ data: pipelines });
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = createPipelineSchema.parse(await request.json());
    const pipeline = await pipelineService.createPipeline(context.agencyId, input);
    return NextResponse.json({ data: pipeline }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status: 400 });
  }
}
