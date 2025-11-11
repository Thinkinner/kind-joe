// db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

declare global {
  // prevent multiple pools in dev/hot-reload
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __drizzle__: ReturnType<typeof drizzle> | undefined;
}

const pool =
  global.__pgPool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // keep the pool small in serverless/dev to avoid connection timeouts
    max: Number(process.env.PG_MAX ?? 3),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS ?? 10_000),
    // toggle SSL via env; for Neon/Render use true (and skip cert)
    ssl:
      process.env.PGSSL?.toLowerCase() === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") global.__pgPool__ = pool;

export const db =
  global.__drizzle__ ??
  drizzle(pool, {
    logger: false,
  });

if (process.env.NODE_ENV !== "production") global.__drizzle__ = db;
