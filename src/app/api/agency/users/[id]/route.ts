import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse, getAgencyContext } from "@/lib/api";
import { updateAgencyUserSchema } from "@/modules/agency/agency.schemas";
import { agencyService, AgencyConflictError, AgencyResourceNotFoundError } from "@/modules/agency/agency.service";

interface AgencyUserRouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: AgencyUserRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = updateAgencyUserSchema.parse(await request.json());
    const user = await agencyService.updateUserRole(agencyContext.agencyId, agencyContext.role, context.params.id, input);
    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof AgencyResourceNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error, "Bad request");
  }
}

export async function DELETE(request: NextRequest, context: AgencyUserRouteContext) {
  try {
    const agencyContext = await getAgencyContext(request);
    if (!agencyContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await agencyService.deleteUser(agencyContext.agencyId, agencyContext.role, agencyContext.userId, context.params.id);
    return NextResponse.json({ data: user });
  } catch (error) {
    if (error instanceof AgencyConflictError) {
      return apiErrorResponse(new ApiError(error.message, 409));
    }
    if (error instanceof AgencyResourceNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error, "Bad request");
  }
}
