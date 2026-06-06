import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse, getAgencyContext } from "@/lib/api";
import { agencyProfileSchema } from "@/modules/agency/agency.schemas";
import { agencyService, AgencyConflictError, AgencyResourceNotFoundError } from "@/modules/agency/agency.service";

export async function GET(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const agency = await agencyService.getProfile(context.agencyId);
    return NextResponse.json({ data: agency });
  } catch (error) {
    if (error instanceof AgencyResourceNotFoundError) {
      return apiErrorResponse(new ApiError(error.message, 404));
    }
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = agencyProfileSchema.parse(await request.json());
    const agency = await agencyService.updateProfile(context.agencyId, input);
    return NextResponse.json({ data: agency });
  } catch (error) {
    if (error instanceof AgencyConflictError) {
      return apiErrorResponse(new ApiError(error.message, 409));
    }
    return apiErrorResponse(error, "Bad request");
  }
}
