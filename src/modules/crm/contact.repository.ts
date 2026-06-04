import type { Contact, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrmContactFilters, CrmCreateContactInput, CrmUpdateContactInput } from "@/modules/crm/contact.schemas";

export interface CrmContactRepository {
  findMany(agencyId: string, filters: CrmContactFilters): Promise<Contact[]>;
  findById(agencyId: string, id: string): Promise<Contact | null>;
  create(agencyId: string, input: CrmCreateContactInput): Promise<Contact>;
  update(agencyId: string, id: string, input: CrmUpdateContactInput): Promise<Contact | null>;
  delete(agencyId: string, id: string): Promise<Contact | null>;
}

function buildContactWhere(agencyId: string, filters: CrmContactFilters): Prisma.ContactWhereInput {
  const search = filters.search?.trim();
  return {
    agencyId,
    ...(filters.tag ? { tags: { has: filters.tag } } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };
}

export const contactRepository: CrmContactRepository = {
  findMany(agencyId, filters) {
    return prisma.contact.findMany({
      where: buildContactWhere(agencyId, filters),
      orderBy: { createdAt: "desc" }
    });
  },
  findById(agencyId, id) {
    return prisma.contact.findFirst({
      where: { id, agencyId }
    });
  },
  create(agencyId, input) {
    return prisma.contact.create({
      data: {
        agencyId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        tags: input.tags,
        customFields: input.customFields as Prisma.InputJsonValue,
        source: input.source
      }
    });
  },
  async update(agencyId, id, input) {
    const existing = await prisma.contact.findFirst({ where: { id, agencyId }, select: { id: true } });
    if (!existing) {
      return null;
    }
    const data: Prisma.ContactUpdateInput = {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.customFields !== undefined ? { customFields: input.customFields as Prisma.InputJsonValue } : {}),
      ...(input.source !== undefined ? { source: input.source } : {})
    };
    return prisma.contact.update({
      where: { id },
      data
    });
  },
  async delete(agencyId, id) {
    const existing = await prisma.contact.findFirst({ where: { id, agencyId }, select: { id: true } });
    if (!existing) {
      return null;
    }
    return prisma.contact.delete({ where: { id } });
  }
};
