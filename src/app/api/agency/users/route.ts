import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { createAgencyUserSchema } from "@/modules/agency/agency.schemas";
import { agencyService, AgencyConflictError, AgencyResourceNotFoundError } from "@/modules/agency/agency.service";

export async function GET(request: NextRequest) {
  const context = await getAgencyContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await agencyService.listUsers(context.agencyId);
  return NextResponse.json({ data: users });
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAgencyContext(request);
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const input = createAgencyUserSchema.parse(await request.json());
    const user = await agencyService.createUser(context.agencyId, context.role, input);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    const status = error instanceof AgencyConflictError ? 409 : error instanceof AgencyResourceNotFoundError ? 403 : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bad request" }, { status });
  }
}
