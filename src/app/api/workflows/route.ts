import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse, getAgencyContext } from "@/lib/api";
import { createWorkflowSchema } from "@/modules/workflows/workflow.schemas";
import { workflowAdminService } from "@/modules/workflows/workflow-admin.service";

export async function GET(request: NextRequest) {
  const context = await getAgencyContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workflows = await workflowAdminService.listWorkflows(context.agencyId);
  return NextResponse.json({ data: workflows });
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = createWorkflowSchema.parse(await request.json());
    const workflow = await workflowAdminService.createWorkflow(context.agencyId, input);
    return NextResponse.json({ data: workflow }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, "Bad request");
  }
}
