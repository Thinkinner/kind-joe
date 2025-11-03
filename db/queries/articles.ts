// src/db/queries/articles.ts
import "server-only";
import { db } from "@/db";
import { articles, users, articleBlocks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { z } from "zod";
import { ArticleInputSchema } from "@/lib/validations/article";

type ArticleInput = z.infer<typeof ArticleInputSchema>;

export async function listArticles() {
  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      category: articles.category, // ✅ add this line
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      publishedAt: articles.publishedAt,
      readingMinutes: articles.readingMinutes,
      author: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(articles)
    .innerJoin(users, eq(users.id, articles.authorId))
    .where(eq(articles.isDraft, false))
    .orderBy(desc(articles.publishedAt))
    .limit(20);
}

export async function getArticleBySlug(slug: string) {
  const [article] = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      publishedAt: articles.publishedAt,
      readingMinutes: articles.readingMinutes,
      author: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(articles)
    .innerJoin(users, eq(users.id, articles.authorId))
    .where(eq(articles.slug, slug))
    .limit(1);

  if (!article) return null;

  const blocks = await db
    .select({
      type: articleBlocks.type,
      data: articleBlocks.data,
      order: articleBlocks.order,
    })
    .from(articleBlocks)
    .where(eq(articleBlocks.articleId, article.id))
    .orderBy(articleBlocks.order);

  return { ...article, blocks: blocks.map((b) => b.data) };
}

export async function createArticle(input: ArticleInput) {
  const id = crypto.randomUUID();
  await db.insert(articles).values({
    id,
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt,
    coverImage: input.coverImage as any,
    authorId: input.authorId,
    isDraft: !(input.publish ?? false),
    publishedAt: input.publish ? new Date() : null,
  });

  const blocks = input.blocks;
  await db.insert(articleBlocks).values(
    blocks.map((b, i) => ({
      articleId: id,
      order: i,
      type: b.type as any,
      data: b as any,
    }))
  );

  return { id };
}
