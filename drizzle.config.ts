// drizzle.config.ts
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

// Same env sources as Next.js (local overrides default).
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  /** Source of truth for push/migrate; `drizzle-kit pull` may write drizzle/schema.ts — merge into this file, do not switch schema path blindly. */
  schema: ["./db/schema.ts", "./db/auth-schema.ts"],
  out: "./drizzle",                 // migration folder
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // reads from env when running scripts
  },
  strict: true,                     // fail on schema drift
  verbose: true,
});
