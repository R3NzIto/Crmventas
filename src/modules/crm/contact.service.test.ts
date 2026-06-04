import type { Contact } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createContactService, CrmContactNotFoundError } from "@/modules/crm/contact.service";
import type { CrmContactRepository } from "@/modules/crm/contact.repository";

function contactFixture(overrides: Partial<Contact> = {}): Contact {
  return {
    id: "contact-1",
    agencyId: "agency-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: null,
    tags: ["lead"],
    customFields: {},
    source: "manual",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

function repositoryMock(): CrmContactRepository {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

describe("contact service", () => {
  it("passes agency scoped filters to the repository", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.findMany).mockResolvedValue([contactFixture()]);
    const service = createContactService(repository);

    await service.getContacts("agency-1", { search: "ada", tag: "lead" });

    expect(repository.findMany).toHaveBeenCalledWith("agency-1", { search: "ada", tag: "lead" });
  });

  it("throws when a contact is outside the agency scope", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);
    const service = createContactService(repository);

    await expect(service.getContactById("agency-1", "missing")).rejects.toBeInstanceOf(CrmContactNotFoundError);
  });

  it("imports csv rows as contacts for the same agency", async () => {
    const repository = repositoryMock();
    vi.mocked(repository.create).mockResolvedValue(contactFixture());
    const service = createContactService(repository);

    const imported = await service.importContactsFromCSV(
      "agency-1",
      "firstName,lastName,email,phone,tags\nGrace,Hopper,grace@example.com,555,customer|vip"
    );

    expect(imported).toHaveLength(1);
    expect(repository.create).toHaveBeenCalledWith("agency-1", {
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
      phone: "555",
      tags: ["customer", "vip"],
      customFields: {},
      source: "csv_import"
    });
  });
});
