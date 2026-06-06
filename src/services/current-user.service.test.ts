import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfile } from "@/services/current-user.service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn()
    }
  }
}));

describe("current user service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the current user scoped to the agency", async () => {
    const profile: NonNullable<Awaited<ReturnType<typeof getCurrentUserProfile>>> = {
      id: "user-1",
      email: "demo@example.com",
      role: "agency_admin",
      agency: {
        id: "agency-1",
        name: "Demo Agency",
        slug: "demo-agency",
        logo: null,
        primaryColor: null,
        plan: "demo"
      }
    };
    vi.mocked(prisma.user.findFirst).mockResolvedValue(profile as unknown as Awaited<ReturnType<typeof prisma.user.findFirst>>);

    const result = await getCurrentUserProfile("user-1", "agency-1");

    expect(result).toEqual(profile);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: "user-1", agencyId: "agency-1" },
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
  });
});
