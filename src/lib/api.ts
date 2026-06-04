import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

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
