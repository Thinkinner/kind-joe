import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Define better defaults for a long-running AI aggregator
const PG_MAX_CONNECTIONS = Number(process.env.PG_MAX ?? 10);
const PG_IDLE_TIMEOUT = Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10_000);
const PG_CONN_TIMEOUT = Number(process.env.PG_CONN_TIMEOUT_MS ?? 30_000);

declare global {
  // eslint-disable-next-line no-var
  var __pgPool__: Pool | undefined;
}

// 1. Configure the Pool
const pool =
  global.__pgPool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: PG_MAX_CONNECTIONS,
    idleTimeoutMillis: PG_IDLE_TIMEOUT,
    connectionTimeoutMillis: PG_CONN_TIMEOUT,
    // FIX: Changed from 'keepalives' to 'keepAlive'
    keepAlive: true,
    ssl:
      process.env.PGSSL?.toLowerCase() === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  global.__pgPool__ = pool;
}

// 2. Initialize Drizzle
export const db = drizzle(pool, {
  logger: false,
});

/**
 * ERROR HANDLING
 * Listen for unexpected errors on idle clients to prevent the Node process from crashing
 */
pool.on("error", (err) => {
  console.error("⚠️ Unexpected error on idle database client", err);
});
