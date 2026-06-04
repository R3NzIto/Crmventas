import { prisma } from "@/lib/prisma";

export function envAgencyKey(prefix: string, agencySlug: string): string {
  const normalizedSlug = agencySlug.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return `${prefix}_${normalizedSlug}`;
}

export async function getAgencySlug(agencyId: string): Promise<string> {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { slug: true }
  });
  return agency?.slug ?? "global";
}

export async function getAgencyEnv(agencyId: string, key: string, fallbackKey: string): Promise<string | undefined> {
  const slug = await getAgencySlug(agencyId);
  return process.env[envAgencyKey(key, slug)] || process.env[fallbackKey];
}
