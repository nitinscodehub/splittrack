import { PrismaClient } from "@prisma/client";
import { validateEnv } from "@/lib/env";

// Fail fast at server startup with a clear message naming the missing variable.
validateEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
