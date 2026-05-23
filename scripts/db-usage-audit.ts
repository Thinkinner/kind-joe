/**
 * Snapshot Neon/Postgres table sizes and row counts for cost debugging.
 * Usage: npx tsx scripts/db-usage-audit.ts
 */
import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  let host = "unknown";
  let pooled = false;
  try {
    const parsed = new URL(url.replace(/^postgres:/, "http:"));
    host = parsed.hostname;
    pooled = host.includes("-pooler") || host.includes("pooler");
  } catch {
    // ignore
  }

  const pool = new Pool({
    connectionString: url,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const sizes = (
      await pool.query<{ table_name: string; bytes: string; pretty: string }>(`
        SELECT
          relname AS table_name,
          pg_total_relation_size(relid)::bigint AS bytes,
          pg_size_pretty(pg_total_relation_size(relid)) AS pretty
        FROM pg_catalog.pg_statio_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT 15
      `)
    ).rows;

    const counts = (
      await pool.query<{ table_name: string; row_count: number }>(`
        SELECT 'news_rss_articles' AS table_name, COUNT(*)::int AS row_count FROM news_rss_articles
        UNION ALL SELECT 'articles', COUNT(*)::int FROM articles
        UNION ALL SELECT 'incoming_events', COUNT(*)::int FROM incoming_events
        UNION ALL SELECT 'article_embeddings', COUNT(*)::int FROM article_embeddings
      `)
    ).rows;

    console.log(
      JSON.stringify(
        {
          connection: { host, pooled },
          topTablesBySize: sizes,
          rowCounts: counts,
          runAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[db-usage-audit] failed", error);
  process.exit(1);
});
