/**
 * Prisma client singleton.
 *
 * Exports a single `PrismaClient` instance for the entire app.
 *
 * Why a singleton?
 * ----------------
 * - In **development**, Next.js HMR re-evaluates server modules on every save.
 *   Without a global cache, each reload would create a new `PrismaClient` and
 *   leak its connection pool, eventually exhausting the database's connection
 *   limit. Stashing the instance on `globalThis` keeps a single client across
 *   reloads.
 * - In **production**, modules are evaluated once per server (or per
 *   serverless cold start), so we create a fresh client and skip the global
 *   cache entirely.
 *
 * Connection string
 * -----------------
 * `DATABASE_URL` is read from the validated `env` module (`lib/env.ts`) and
 * should point at NeonDB's pooled connection (`-pooler` host) for serverless
 * runtimes. Validation happens at startup, so a missing/empty value fails
 * fast with a clear error rather than at first query.
 *
 * Graceful disconnect
 * -------------------
 * On serverless and Node.js shutdown, we listen for `beforeExit` and call
 * `prisma.$disconnect()` so the underlying pool is closed cleanly. The
 * listener is registered once (guarded via `globalThis`) to avoid duplicate
 * registration during HMR.
 *
 * Validates: Requirements 1.4, 28.5.
 */

// Prisma 7 requires the driver adapter for PostgreSQL.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

// Create the driver adapter using the validated, pooled NeonDB connection
// string. Keeping this at module scope means Prisma 7's required adapter is
// constructed exactly once per process.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// Cache the client (and a flag for the shutdown hook) on `globalThis` so dev
// HMR doesn't leak connections and we don't register the disconnect listener
// more than once.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDisconnectRegistered: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful disconnect for serverless / process shutdown. Guard against
// duplicate listener registration across HMR reloads.
if (!globalForPrisma.prismaDisconnectRegistered) {
  globalForPrisma.prismaDisconnectRegistered = true;
  process.on("beforeExit", () => {
    void prisma.$disconnect();
  });
}

export default prisma;
