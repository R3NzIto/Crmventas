import { NextResponse, type NextRequest } from "next/server";
import { getAgencyContext } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const context = await getAgencyContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findFirst({
    where: { id: context.userId, agencyId: context.agencyId },
    select: {
      id: true,
      email: true,
      role: true,
      agency: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          primaryColor: true,
          plan: true
        }
      }
    }
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ data: user });
}
