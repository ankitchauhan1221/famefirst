import { PrismaClient } from "@prisma/client";

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForDb.prisma ?? new PrismaClient({ transactionOptions: { maxWait: 15_000, timeout: 15_000 } });

if (process.env.NODE_ENV !== "production") globalForDb.prisma = db;
