// src/db/cli.ts
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

neonConfig.fetchConnectionCache = true;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL missing.");

const sql = neon(connectionString);
export const db = drizzle(sql, { schema, logger: false });

export * as s from "./schema";
