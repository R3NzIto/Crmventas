import { z } from "zod";

export const agencyProfileSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional().or(z.literal("")),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional()
    .or(z.literal("")),
  plan: z.string().trim().min(1).optional()
});

export const createAgencyUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["agency_admin", "agency_user"]).default("agency_user")
});

export const updateAgencyUserSchema = z.object({
  role: z.enum(["agency_admin", "agency_user"])
});

export const registerAgencySchema = z.object({
  agencyName: z.string().trim().min(1),
  agencySlug: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().optional(),
  email: z.string().email(),
  password: z.string().min(8)
});

export type AgencyProfileInput = z.infer<typeof agencyProfileSchema>;
export type AgencyCreateUserInput = z.infer<typeof createAgencyUserSchema>;
export type AgencyUpdateUserInput = z.infer<typeof updateAgencyUserSchema>;
export type AgencyRegisterInput = z.infer<typeof registerAgencySchema>;
