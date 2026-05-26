// app/rss.xml/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db"; // adjust to your actual db path
import { articles, articleTags, tags, users } from "@/db/schema";
import { and, eq, isNotNull, gte, lt, sql } from "drizzle-orm";
import { publicSiteOrigin, publicSiteUrl } from "@/lib/site/public-site-url";

// Helper: get start/end of "today" in UTC
function getTodayRangeUTC() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return { start, end };
}

const SITE_TITLE = "Kind Joe";
const SITE_DESCRIPTION = "Latest news and articles from Kind Joe";
const SITE_LANGUAGE = "en-us"; // or whatever you use

export async function GET() {
  const siteUrl = publicSiteOrigin();
  const { start, end } = getTodayRangeUTC();

  // Fetch today's published articles with author
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      publishedAt: articles.publishedAt,
      authorName: users.name,
      coverImageUrl: articles.coverImageUrl,
      contentHtml: articles.contentHtml,
      isVentura: sql<boolean>`bool_or(${tags.slug} = 'ventura-county')`,
    })
    .from(articles)
    .innerJoin(users, eq(articles.authorId, users.id))
    .leftJoin(articleTags, eq(articleTags.articleId, articles.id))
    .leftJoin(tags, eq(tags.id, articleTags.tagId))
    .where(
      and(
        eq(articles.isDraft, false),
        isNotNull(articles.publishedAt),
        gte(articles.publishedAt, start),
        lt(articles.publishedAt, end),
      ),
    )
    .groupBy(
      articles.id,
      articles.slug,
      articles.title,
      articles.excerpt,
      articles.publishedAt,
      users.name,
      articles.coverImageUrl,
      articles.contentHtml,
    )
    .orderBy(articles.publishedAt);

  // Build RSS items
  const itemsXml = rows
  .map((article) => {
    const path = article.isVentura
      ? `/ventura/${article.slug}`
      : `/${article.slug}`;
    const url = publicSiteUrl(path, siteUrl);
    const pubDate = article.publishedAt
      ? new Date(article.publishedAt).toUTCString()
      : new Date().toUTCString();

    const description =
      article.contentHtml ?? article.excerpt ?? "";

    return `
      <item>
        <title>${escape(article.title)}</title>
        <link>${url}</link>
        <guid isPermaLink="true">${url}</guid>
        <pubDate>${pubDate}</pubDate>
        <author>${escape(article.authorName ?? "Kind Joe Staff")}</author>
        ${
          article.coverImageUrl
            ? `<enclosure url="${article.coverImageUrl}" type="image/jpeg" />`
            : ""
        }
        <description><![CDATA[${description}]]></description>
      </item>`;
  })
  .join("");


  // Full RSS 2.0 XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
>
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${siteUrl}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>${SITE_LANGUAGE}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${publicSiteUrl("/rss.xml", siteUrl)}" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
