"use server";

import { db } from "@/db"; // adjust path to your db folder
import { articles, users } from "@/db/schema";
import { ilike, or, and, isNull, eq } from "drizzle-orm";

export async function searchArticles(query: string) {
  if (!query || query.length < 2) return [];

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
          ilike(articles.title, `%${query}%`),
          ilike(articles.excerpt, `%${query}%`),
          ilike(articles.category, `%${query}%`)
        )
      )
    )
    .limit(8);

  return results;
}