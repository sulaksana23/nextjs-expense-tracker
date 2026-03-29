import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";
import { getRuntimeDatabaseUrl } from "@/lib/database-url";
import { Pool } from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

const connectionString = getRuntimeDatabaseUrl();

if (!connectionString) {
  throw new Error(
    "Database URL is not set. Expected one of POSTGRES_PRISMA_URL, POSTGRES_URL, or DATABASE_URL.",
  );
}

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaPool = pool;
}
