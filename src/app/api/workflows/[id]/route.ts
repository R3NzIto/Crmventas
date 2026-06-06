import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse, getAgencyContext } from "@/lib/api";
import { updateWorkflowSchema } from "@/modules/workflows/workflow.schemas";
import { workflowAdminService, WorkflowAdminNotFoundError } from "@/modules/workflows/workflow-admin.service";

interface WorkflowRouteContext {
  params: { id: string };
}

export async function GET(request: NextRequest, context: WorkflowRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workflow = await workflowAdminService.getWorkflowById(agencyContext.agencyId, context.params.id);
    return NextResponse.json({ data: workflow });
  } catch (error) {
    if (error instanceof WorkflowAdminNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: WorkflowRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = updateWorkflowSchema.parse(await request.json());
    const workflow = await workflowAdminService.updateWorkflow(agencyContext.agencyId, context.params.id, input);
    return NextResponse.json({ data: workflow });
  } catch (error) {
    if (error instanceof WorkflowAdminNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error, "Bad request");
  }
}

export async function DELETE(request: NextRequest, context: WorkflowRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workflow = await workflowAdminService.deleteWorkflow(agencyContext.agencyId, context.params.id);
    return NextResponse.json({ data: workflow });
  } catch (error) {
    if (error instanceof WorkflowAdminNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error);
  }
}
