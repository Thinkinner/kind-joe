// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",                 // migration folder
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // reads from env when running scripts
  },
  strict: true,                     // fail on schema drift
  verbose: true,
});
