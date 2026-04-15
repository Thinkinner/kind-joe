// app/api/articles/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db"; // 👈 change this path to where your drizzle instance is
import { articles, users } from "@/db/schema"; // 👈 adjust path
import { and, desc, eq, isNull, sql } from "drizzle-orm";

const MAX_PUBLIC = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = Number(searchParams.get("limit") ?? "20");
  const limit = Math.min(Math.max(Number.isFinite(raw) ? raw : 20, 1), MAX_PUBLIC);

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      publishedAt: articles.publishedAt,
      readingMinutes: articles.readingMinutes,
      category: articles.category,
      authorName: sql<string>`coalesce(${users.aliasFullName}, ${users.name})`,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(
      and(
        eq(articles.isDraft, false),    // only non-drafts
        isNull(articles.deletedAt)      // soft-delete aware
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit);

  return NextResponse.json(rows);
}
