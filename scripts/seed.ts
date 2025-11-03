// src/scripts/seed.ts
import "dotenv/config";
import { db, s } from "@/db/cli";
import { eq, and } from "drizzle-orm";
import { sampleArticles } from "@/lib/fixtures/articles";
import { BlocksSchema } from "@/lib/validations/article";

// Optional: seed a simple author if not exists
async function ensureAuthor() {
  const userId = "usr_henry";
  const [existing] = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(eq(s.users.id, userId))
    .limit(1);

  if (!existing) {
    await db.insert(s.users).values({
      id: userId,
      name: "Henry Doe",
      avatarUrl: "https://i.pravatar.cc/150?u=henry",
    });
    console.log("✓ Seeded user usr_henry");
  } else {
    console.log("• Author usr_henry already exists");
  }
}

async function upsertArticle(article: (typeof sampleArticles)[number]) {
  // Upsert the article
  const [existing] = await db
    .select({ id: s.articles.id })
    .from(s.articles)
    .where(eq(s.articles.slug, article.slug))
    .limit(1);

  if (!existing) {
    await db.insert(s.articles).values({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      coverImage: article.coverImage as any,
      authorId: article.authorId,
      isDraft: article.isDraft,
      publishedAt: article.publishedAt,
      readingMinutes: article.readingMinutes,
      seo: article.seo as any,
    });
    console.log(`✓ Inserted article ${article.slug}`);
  } else {
    await db
      .update(s.articles)
      .set({
        title: article.title,
        excerpt: article.excerpt,
        coverImage: article.coverImage as any,
        authorId: article.authorId,
        isDraft: article.isDraft,
        publishedAt: article.publishedAt,
        readingMinutes: article.readingMinutes,
        seo: article.seo as any,
        updatedAt: new Date(),
      })
      .where(eq(s.articles.slug, article.slug));
    console.log(`• Updated article ${article.slug}`);
  }

  // Clear existing blocks (simple approach for seed)
  await db
    .delete(s.articleBlocks)
    .where(eq(s.articleBlocks.articleId, article.id));

  // Validate blocks then insert
  const blocks = BlocksSchema.parse(article.blocks);
  await db.insert(s.articleBlocks).values(
    blocks.map((b, i) => ({
      articleId: article.id,
      order: i,
      type: b.type as any,
      data: b as any,
    }))
  );

  console.log(`  ↳ ${blocks.length} blocks for ${article.slug}`);
}

async function main() {
  await ensureAuthor();

  for (const a of sampleArticles) {
    await upsertArticle(a);
  }

  console.log("Done seeding.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
