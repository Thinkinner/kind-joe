import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  // 🚨 Give the DB 30 seconds to wait for Gemini
  connectionTimeoutMillis: 30000, 
  // 🚨 Send heartbeats to the DB so it doesn't close the connection
  keepAlive: true, 
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);