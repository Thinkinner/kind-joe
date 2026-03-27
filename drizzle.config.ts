// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  /** Source of truth for push/migrate; `drizzle-kit pull` may write drizzle/schema.ts — merge into this file, do not switch schema path blindly. */
  schema: "./db/schema.ts",
  out: "./drizzle",                 // migration folder
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // reads from env when running scripts
  },
  strict: true,                     // fail on schema drift
  verbose: true,
});
