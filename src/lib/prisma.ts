import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { getEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = getEnv("DATABASE_URL") || "file:./dev.db";

  if (url.startsWith("libsql://") || url.startsWith("https://")) {
    const libsql = createClient({
      url,
      authToken: getEnv("TURSO_AUTH_TOKEN"),
    });
    return new PrismaClient({ adapter: new PrismaLibSQL(libsql) });
  }

  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
