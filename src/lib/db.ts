// File: src/lib/db.ts

import { PrismaClient, DocumentType } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export the enum so you can do e.g. DocumentType.EXECUTIVE_ORDER
export { DocumentType };
