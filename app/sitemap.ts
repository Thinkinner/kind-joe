// app/sitemap.ts
import { MetadataRoute } from "next";
import { db } from "@/db";
import { articles, articleTags, tags } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { publicSiteOrigin, publicSiteUrl } from "@/lib/site/public-site-url";

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
  const baseUrl = publicSiteOrigin();
  const now = new Date();

  let rows: {
    slug: string;
    updatedAt: Date | null;
    publishedAt: Date | null;
    createdAt: Date | null;
    isVentura: boolean;
  }[] = [];

  if (process.env.DATABASE_URL) {
    try {
      rows = await db
        .select({
          slug: articles.slug,
          updatedAt: articles.updatedAt,
          publishedAt: articles.publishedAt,
          createdAt: articles.createdAt,
          isVentura: sql<boolean>`bool_or(${tags.slug} = 'ventura-county')`,
        })
        .from(articles)
        .leftJoin(articleTags, eq(articleTags.articleId, articles.id))
        .leftJoin(tags, eq(tags.id, articleTags.tagId))
        .where(publishedWhereForSitemap(now))
        .groupBy(
          articles.slug,
          articles.updatedAt,
          articles.publishedAt,
          articles.createdAt,
        );
    } catch (error) {
      console.error("sitemap_articles_query_failed", error);
    }
  }

  const staticPaths = [
    "/",
    "/about",
    "/contact",
    "/news",
    "/tech",
    "/politics",
    "/business",
    "/opinion",
    "/ventura-county",
    "/council-tea",
    "/newsletter",
    "/privacy-policy",
    "/terms-of-service",
    "/disclaimer",
    "/editorial-policy",
  ] as const;

  const staticPages: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: publicSiteUrl(path, baseUrl),
    lastModified: now,
    changeFrequency: path === "/" ? ("daily" as const) : ("monthly" as const),
    priority: path === "/" ? 1 : 0.7,
  }));

  return [
    ...staticPages,
    ...rows.map((a) => ({
      url: publicSiteUrl(
        `/${a.slug}`,
        baseUrl,
      ),
      lastModified: a.updatedAt ?? a.publishedAt ?? a.createdAt ?? now,
    })),
  ];
}
