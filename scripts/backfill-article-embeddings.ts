/**
 * Backfill article embeddings for published stories.
 * Usage:
 *   npx tsx scripts/backfill-article-embeddings.ts [limit] [offset]
 */
import "dotenv/config";
import { and, desc, eq, isNull, isNotNull, lte, or } from "drizzle-orm";
import { db } from "../db";
import { articles } from "../db/schema";
import { syncArticleEmbeddingByArticleId } from "../lib/recommendations/article-related";

const DEFAULT_LIMIT = 500;

async function main() {
  const limit = Math.max(
    1,
    Number.parseInt(process.argv[2] ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
  );
  const offset = Math.max(0, Number.parseInt(process.argv[3] ?? "0", 10) || 0);
  const now = new Date();

  console.log(`[embeddings] loading published articles (limit=${limit}, offset=${offset})`);

  const rows = await db
    .select({ id: articles.id })
    .from(articles)
    .where(
      and(
        eq(articles.isDraft, false),
        isNull(articles.deletedAt),
        or(
          and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
          and(isNull(articles.publishedAt), isNotNull(articles.publishAt), lte(articles.publishAt, now)),
        ),
      ),
    )
    .orderBy(desc(articles.publishedAt), desc(articles.publishAt))
    .limit(limit)
    .offset(offset);

  let updated = 0;
  let skipped = 0;
  let removed = 0;

  for (const row of rows) {
    const result = await syncArticleEmbeddingByArticleId(row.id);
    if (result === "updated") updated += 1;
    else if (result === "removed") removed += 1;
    else skipped += 1;
  }

  console.log(
    `[embeddings] done. total=${rows.length}, updated=${updated}, skipped=${skipped}, removed=${removed}`,
  );
}

main().catch((error) => {
  console.error("[embeddings] backfill failed", error);
  process.exit(1);
});

