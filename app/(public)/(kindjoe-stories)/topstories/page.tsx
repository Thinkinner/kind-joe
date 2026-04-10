// app/kindjoetopstories/page.tsx
import Link from "next/link";
import { db } from "@/db";
import {
  articles,
  users,
  articleTags,
  tags,
} from "@/db/schema";
import { and, eq, isNull, sql, desc } from "drizzle-orm";

export const revalidate = 60;

const FEATURED_TAG_SLUG = "kindjoetopstories";

function publishedFilter(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    sql<boolean>`(
      (
        ${articles.publishedAt} IS NOT NULL
        AND ${articles.publishedAt} <= ${now}
      )
      OR (
        ${articles.publishedAt} IS NULL
        AND ${articles.publishAt} IS NOT NULL
        AND ${articles.publishAt} <= ${now}
      )
    )`
  );
}

export default async function KindjoeTopStoriesPage() {
  const now = new Date();

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      createdAt: articles.createdAt,
      readingMinutes: articles.readingMinutes,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(articles)
    .innerJoin(articleTags, eq(articleTags.articleId, articles.id))
    .innerJoin(tags, eq(tags.id, articleTags.tagId))
    .leftJoin(users, eq(users.id, articles.authorId))
    .where(
      and(
        eq(tags.slug, FEATURED_TAG_SLUG),
        publishedFilter(now)
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(48);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Kindjoe Top Stories
        </h1>
        <p className="text-sm text-gray-600">
          Curated articles tagged with <code>{FEATURED_TAG_SLUG}</code> (up to
          48 most recent).
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No top stories available right now.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((article) => {
            const date =
              article.publishedAt ??
              article.publishAt ??
              article.createdAt;

            return (
              <article
                key={article.id}
                className="border rounded-xl overflow-hidden bg-white shadow-sm flex flex-col"
              >
                {article.coverImageUrl && (
                  <div className="w-full h-40 bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={article.coverImageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="text-xs text-gray-500">
                    {date && (
                      <>
                        {new Date(String(date)).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </>
                    )}
                    {article.readingMinutes && (
                      <> · {article.readingMinutes} min read</>
                    )}
                  </div>

                  <h2 className="font-semibold text-lg leading-snug">
                    <Link href={`/articles/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h2>

                  {article.excerpt && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-gray-600">
                    {article.authorAvatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.authorAvatarUrl}
                        alt={article.authorName ?? "Author"}
                        className="w-7 h-7 rounded-full object-cover border"
                      />
                    )}
                    {article.authorName && (
                      <span>{article.authorName}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
