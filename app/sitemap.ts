// app/sitemap.ts
import { MetadataRoute } from "next";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

// ... keep your publishedWhereForSitemap function exactly as it was ...
function publishedWhereForSitemap(now = new Date()) {
  return and(
    eq(articles.isDraft, false),
    isNull(articles.deletedAt),
    sql<boolean>`
      (
        ${articles.publishedAt} IS NOT NULL
        AND ${articles.publishedAt} <= ${now}
      )
      OR (
        ${articles.publishedAt} IS NULL
        AND ${articles.publishAt} IS NOT NULL
        AND ${articles.publishAt} <= ${now}
      )
    `,
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Make sure your env variable is https://www.kindjoe.com (no trailing slash)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kindjoe.com";
  const now = new Date();

  const rows = await db
    .select({
      slug: articles.slug,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
    })
    .from(articles)
    .where(publishedWhereForSitemap(now));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily", // Optional: tells Google you update often
      priority: 1, // Optional: tells Google this is the most important page
    },
    // I REMOVED THE DUPLICATE OBJECT HERE
    ...rows.map((a) => ({
      url: `${baseUrl}/${a.slug}`,
      lastModified: a.updatedAt ?? a.publishedAt ?? a.createdAt ?? now,
    })),
  ];
}
