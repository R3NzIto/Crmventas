import type { Agency, User, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type {
  AgencyCreateUserInput,
  AgencyProfileInput,
  AgencyRegisterInput,
  AgencyUpdateUserInput
} from "@/modules/agency/agency.schemas";

export type AgencyUserListItem = Pick<User, "id" | "email" | "role" | "agencyId" | "createdAt">;
export type AgencyProfile = Pick<Agency, "id" | "name" | "slug" | "logo" | "primaryColor" | "plan" | "createdAt">;

export class AgencyResourceNotFoundError extends Error {
  constructor(message = "Recurso de agencia no encontrado") {
    super(message);
  }
}

export class AgencyConflictError extends Error {
  constructor(message = "El recurso de agencia ya existe") {
    super(message);
  }
}

function normalizeOptional(value?: string): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.trim() ? value.trim() : null;
}

function canManageAgencyUsers(role: string): boolean {
  return role === "super_admin" || role === "agency_admin";
}

export function createAgencyService() {
  return {
    async getProfile(agencyId: string): Promise<AgencyProfile> {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          primaryColor: true,
          plan: true,
          createdAt: true
        }
      });
      if (!agency) {
        throw new AgencyResourceNotFoundError("Agencia no encontrada");
      }
      return agency;
    },

    async updateProfile(agencyId: string, input: AgencyProfileInput): Promise<AgencyProfile> {
      const slugOwner = await prisma.agency.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (slugOwner && slugOwner.id !== agencyId) {
        throw new AgencyConflictError("El slug de la agencia ya esta en uso");
      }
      return prisma.agency.update({
        where: { id: agencyId },
        data: {
          name: input.name,
          slug: input.slug,
          logo: normalizeOptional(input.logo),
          primaryColor: normalizeOptional(input.primaryColor),
          ...(input.plan ? { plan: input.plan } : {})
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          primaryColor: true,
          plan: true,
          createdAt: true
        }
      });
    },

    async listUsers(agencyId: string): Promise<AgencyUserListItem[]> {
      return prisma.user.findMany({
        where: { agencyId },
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
          createdAt: true
        },
        orderBy: { createdAt: "asc" }
      });
    },

    async createUser(agencyId: string, actorRole: string, input: AgencyCreateUserInput): Promise<AgencyUserListItem> {
      if (!canManageAgencyUsers(actorRole)) {
        throw new AgencyResourceNotFoundError("Permisos insuficientes");
      }
      const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (existing) {
        throw new AgencyConflictError("El email ya esta en uso");
      }
      const hashedPassword = await hash(input.password, 12);
      return prisma.user.create({
        data: {
          email: input.email,
          hashedPassword,
          role: input.role,
          agencyId
        },
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
          createdAt: true
        }
      });
    },

    async updateUserRole(agencyId: string, actorRole: string, userId: string, input: AgencyUpdateUserInput): Promise<AgencyUserListItem> {
      if (!canManageAgencyUsers(actorRole)) {
        throw new AgencyResourceNotFoundError("Permisos insuficientes");
      }
      const user = await prisma.user.findFirst({ where: { id: userId, agencyId }, select: { id: true } });
      if (!user) {
        throw new AgencyResourceNotFoundError("Usuario no encontrado");
      }
      return prisma.user.update({
        where: { id: userId },
        data: { role: input.role as UserRole },
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
          createdAt: true
        }
      });
    },

    async deleteUser(agencyId: string, actorRole: string, actorUserId: string, userId: string): Promise<AgencyUserListItem> {
      if (!canManageAgencyUsers(actorRole)) {
        throw new AgencyResourceNotFoundError("Permisos insuficientes");
      }
      if (actorUserId === userId) {
        throw new AgencyConflictError("No podes eliminar tu propio usuario");
      }
      const user = await prisma.user.findFirst({ where: { id: userId, agencyId }, select: { id: true } });
      if (!user) {
        throw new AgencyResourceNotFoundError("Usuario no encontrado");
      }
      return prisma.user.delete({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
          createdAt: true
        }
      });
    },

    async registerAgency(input: AgencyRegisterInput): Promise<AgencyProfile> {
      const existingAgency = await prisma.agency.findUnique({ where: { slug: input.agencySlug }, select: { id: true } });
      if (existingAgency) {
        throw new AgencyConflictError("El slug de la agencia ya esta en uso");
      }
      const existingUser = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (existingUser) {
        throw new AgencyConflictError("El email ya esta en uso");
      }
      const hashedPassword = await hash(input.password, 12);
      const agency = await prisma.agency.create({
        data: {
          name: input.agencyName,
          slug: input.agencySlug,
          plan: "trial",
          primaryColor: "#2563eb",
          users: {
            create: {
              email: input.email,
              hashedPassword,
              role: "agency_admin"
            }
          }
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          primaryColor: true,
          plan: true,
          createdAt: true
        }
      });
      return agency;
    }
  };
}

export const agencyService = createAgencyService();
