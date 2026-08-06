import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

function parsePoolMax(): number {
  const parsed = Number.parseInt(process.env.DB_POOL_MAX ?? "2", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

function parseConnectTimeoutMs(): number {
  const parsed = Number.parseInt(
    process.env.DB_CONNECTION_TIMEOUT_MS ?? "5000",
    10,
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parsePoolMax(),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: parseConnectTimeoutMs(),
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);
