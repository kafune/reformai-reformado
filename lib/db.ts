import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Em dev o hot reload recria módulos; guardamos o client no global para não abrir N conexões.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Tipo do client dentro de uma transação (`db.$transaction(async (tx) => ...)`). */
export type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];
