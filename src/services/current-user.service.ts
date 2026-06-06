import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const currentUserSelect = {
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
} satisfies Prisma.UserSelect;

export type CurrentUserProfile = Prisma.UserGetPayload<{ select: typeof currentUserSelect }>;

export async function getCurrentUserProfile(userId: string, agencyId: string): Promise<CurrentUserProfile | null> {
  return prisma.user.findFirst({
    where: { id: userId, agencyId },
    select: currentUserSelect
  });
}
