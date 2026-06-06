import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface AgencyContext {
  userId: string;
  agencyId: string;
  role: string;
}

export async function getAgencyContext(request: NextRequest): Promise<AgencyContext | null> {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub || typeof token.agencyId !== "string" || typeof token.role !== "string") {
    return null;
  }

  return {
    userId: token.sub,
    agencyId: token.agencyId,
    role: token.role
  };
}

export function parseRouteId(params: { id: string }): string {
  return params.id;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown, fallbackMessage = "Internal server error") {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request", issues: error.issues }, { status: 400 });
  }

  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const status = fallbackMessage === "Bad request" ? 400 : 500;
  return NextResponse.json({ error: status === 500 ? "Internal server error" : fallbackMessage }, { status });
}
