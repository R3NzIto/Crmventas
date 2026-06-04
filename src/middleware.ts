import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export interface TenantAuthorizationInput {
  userAgencyId?: string;
  resourceAgencyId?: string | null;
}

export function isAuthorizedForAgency(input: TenantAuthorizationInput): boolean {
  if (!input.userAgencyId) {
    return false;
  }
  if (!input.resourceAgencyId) {
    return true;
  }
  return input.userAgencyId === input.resourceAgencyId;
}

export function headersWithAgencyId(request: NextRequest, agencyId: string): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-agency-id", agencyId);
  return headers;
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const agencyId = typeof token?.agencyId === "string" ? token.agencyId : undefined;
  const resourceAgencyId = request.nextUrl.searchParams.get("agencyId") ?? request.headers.get("x-resource-agency-id");

  if (!isAuthorizedForAgency({ userAgencyId: agencyId, resourceAgencyId })) {
    const loginUrl = new URL("/login", request.url);
    if (!agencyId) {
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!agencyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const authorizedAgencyId = agencyId;
  return NextResponse.next({
    request: {
      headers: headersWithAgencyId(request, authorizedAgencyId)
    }
  });
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
