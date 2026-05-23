import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

function parsePoolMax(): number {
  const parsed = Number.parseInt(process.env.DB_POOL_MAX ?? "2", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parsePoolMax(),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);