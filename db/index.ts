// db/index.ts
import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema"; // <- your /db/schema.ts from earlier

// Reuse HTTP connections across invocations (helps in serverless & dev)
neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add it to your environment.");
}

// Create the Neon HTTP sql client
const sql = neon(connectionString);

// Create a singleton Drizzle instance (prevents duplicates in dev)
const globalForDb = globalThis as unknown as {
  __DRIZZLE__?: ReturnType<typeof drizzle<typeof schema>>;
};

export const db =
  globalForDb.__DRIZZLE__ ??
  drizzle(sql, {
    schema,           // typed queries from your tables
    logger: false,    // set true to debug SQL in dev
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__DRIZZLE__ = db;
}

// Optional: export schema for convenience
export * from "./schema";
