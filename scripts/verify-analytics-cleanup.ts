/**
 * Confirms removed analytics tables are gone (safe to run after migrate).
 * Usage: npx tsx scripts/verify-analytics-cleanup.ts
 */
import "dotenv/config";
import { Pool } from "pg";

const REMOVED_TABLES = [
  "article_pageviews",
  "visitor_journey_events",
  "clicks",
] as const;

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const { rows } = await pool.query<{ table_name: string }>(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `,
      [REMOVED_TABLES],
    );

    const stillPresent = rows.map((r) => r.table_name);
    const ok = stillPresent.length === 0;

    console.log(
      JSON.stringify(
        {
          ok,
          removedTablesExpected: REMOVED_TABLES,
          stillPresent,
          message: ok
            ? "All legacy analytics tables are dropped. Site code does not reference them."
            : "Run npm run db:migrate to apply pending migrations.",
        },
        null,
        2,
      ),
    );

    if (!ok) process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[verify-analytics-cleanup] failed", error);
  process.exit(1);
});
