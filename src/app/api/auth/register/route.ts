import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api";
import { registerAgencySchema } from "@/modules/agency/agency.schemas";
import { agencyService, AgencyConflictError } from "@/modules/agency/agency.service";

export async function POST(request: NextRequest) {
  try {
    const input = registerAgencySchema.parse(await request.json());
    const agency = await agencyService.registerAgency(input);
    return NextResponse.json({ data: agency }, { status: 201 });
  } catch (error) {
    if (error instanceof AgencyConflictError) {
      return apiErrorResponse(new ApiError(error.message, 409));
    }
    return apiErrorResponse(error, "Bad request");
  }
}
