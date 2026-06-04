import type { Agency, User } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createAgencyService, AgencyConflictError, AgencyResourceNotFoundError } from "@/modules/agency/agency.service";

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password")
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agency: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

import { prisma } from "@/lib/prisma";

function agencyFixture(overrides: Partial<Agency> = {}): Agency {
  return {
    id: "agency-1",
    name: "Demo Agency",
    slug: "demo-agency",
    logo: null,
    primaryColor: "#2563eb",
    plan: "pro",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "demo@example.com",
    hashedPassword: "hashed",
    role: "agency_user",
    agencyId: "agency-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

describe("agency service", () => {
  it("lists users scoped by agency", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([userFixture()]);
    const service = createAgencyService();

    await service.listUsers("agency-1");

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agencyId: "agency-1" }
      })
    );
  });

  it("blocks agency user creation for non-admin roles", async () => {
    const service = createAgencyService();

    await expect(
      service.createUser("agency-1", "agency_user", {
        email: "new@example.com",
        password: "Password123",
        role: "agency_user"
      })
    ).rejects.toBeInstanceOf(AgencyResourceNotFoundError);
  });

  it("creates an agency user with a hashed password for admins", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(userFixture({ email: "new@example.com" }));
    const service = createAgencyService();

    const user = await service.createUser("agency-1", "agency_admin", {
      email: "new@example.com",
      password: "Password123",
      role: "agency_user"
    });

    expect(user.email).toBe("new@example.com");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          agencyId: "agency-1",
          hashedPassword: "hashed-password"
        })
      })
    );
  });

  it("prevents profile slug conflicts across agencies", async () => {
    vi.mocked(prisma.agency.findUnique).mockResolvedValue(agencyFixture({ id: "other-agency" }));
    const service = createAgencyService();

    await expect(
      service.updateProfile("agency-1", {
        name: "Demo Agency",
        slug: "taken-slug",
        logo: "",
        primaryColor: "#2563eb",
        plan: "pro"
      })
    ).rejects.toBeInstanceOf(AgencyConflictError);
  });
});
