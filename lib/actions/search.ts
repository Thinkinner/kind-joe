"use server";

import { db } from "@/db"; // adjust path to your db folder
import { articles, users } from "@/db/schema";
import { ilike, or, and, isNull, eq, isNotNull, lte } from "drizzle-orm";

export async function searchArticles(query: string) {
  if (!query || query.length < 2) return [];
  const now = new Date();

  const results = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      category: articles.category,
      authorName: users.name,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(
      and(
        eq(articles.isDraft, false),
        isNull(articles.deletedAt),
        or(
          and(isNotNull(articles.publishedAt), lte(articles.publishedAt, now)),
          and(
            isNull(articles.publishedAt),
            isNotNull(articles.publishAt),
            lte(articles.publishAt, now)
          )
        ),
        or(
          ilike(articles.title, `%${query}%`),
          ilike(articles.excerpt, `%${query}%`),
          ilike(articles.category, `%${query}%`)
        )
      )
    )
    .limit(8);

  return results;
}