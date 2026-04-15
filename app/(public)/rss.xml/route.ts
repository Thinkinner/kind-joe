// app/rss.xml/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db"; // adjust to your actual db path
import { articles, users } from "@/db/schema";
import { and, eq, isNotNull, gte, lt } from "drizzle-orm";

// Helper: get start/end of "today" in UTC
function getTodayRangeUTC() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return { start, end };
}

// Change this to your canonical site URL
const SITE_URL = "https://example.com";
const SITE_TITLE = "My News Site";
const SITE_DESCRIPTION = "Latest news and articles from My News Site";
const SITE_LANGUAGE = "en-us"; // or whatever you use

export async function GET() {
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
    })
    .from(articles)
    .innerJoin(users, eq(articles.authorId, users.id))
    .where(
      and(
        eq(articles.isDraft, false),
        isNotNull(articles.publishedAt),
        gte(articles.publishedAt, start),
        lt(articles.publishedAt, end),
      ),
    )
    .orderBy(articles.publishedAt); // newest last or first depending on your preference

  // Build RSS items
  const itemsXml = rows
  .map((article) => {
    const url = `${SITE_URL}/articles/${article.slug}`;
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
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>${SITE_LANGUAGE}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
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
