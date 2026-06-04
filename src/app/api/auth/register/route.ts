import { NextResponse, type NextRequest } from "next/server";
import { registerAgencySchema } from "@/modules/agency/agency.schemas";
import { agencyService, AgencyConflictError } from "@/modules/agency/agency.service";

export async function POST(request: NextRequest) {
  try {
    const input = registerAgencySchema.parse(await request.json());
    const agency = await agencyService.registerAgency(input);
    return NextResponse.json({ data: agency }, { status: 201 });
  } catch (error) {
    const status = error instanceof AgencyConflictError ? 409 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}
