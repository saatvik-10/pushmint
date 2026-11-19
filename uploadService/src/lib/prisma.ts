import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client";

declare global {
  // Reuse connections during local reloads.
  var __pushmintPrisma: PrismaClient | undefined;
  var __pushmintPool: pg.Pool | undefined;
}

const pool =
  globalThis.__pushmintPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
const adapter = new PrismaPg(pool);

export const prisma =
  globalThis.__pushmintPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pushmintPool = pool;
  globalThis.__pushmintPrisma = prisma;
}
