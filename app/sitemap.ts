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

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/editorial-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  return [
    ...staticPages,
    ...rows.map((a) => ({
      url: `${baseUrl}/${a.slug}`,
      lastModified: a.updatedAt ?? a.publishedAt ?? a.createdAt ?? now,
    })),
  ];
}
