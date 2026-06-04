import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
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
    const status = error instanceof AgencyResourceNotFoundError ? 404 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
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
    const status = error instanceof AgencyConflictError ? 409 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}
