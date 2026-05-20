import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  newsRssArticles,
  rssAutoWriterQueue,
} from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const [queueRows, statusCounts] = await Promise.all([
    db
      .select({
        id: rssAutoWriterQueue.id,
        status: rssAutoWriterQueue.status,
        sourceUrl: rssAutoWriterQueue.sourceUrl,
        sourceName: rssAutoWriterQueue.sourceName,
        attemptCount: rssAutoWriterQueue.attemptCount,
        lastError: rssAutoWriterQueue.lastError,
        lockedAt: rssAutoWriterQueue.lockedAt,
        processedAt: rssAutoWriterQueue.processedAt,
        createdAt: rssAutoWriterQueue.createdAt,
        updatedAt: rssAutoWriterQueue.updatedAt,
        articleId: rssAutoWriterQueue.articleId,
        rssTitle: newsRssArticles.title,
        articleTitle: articles.title,
      })
      .from(rssAutoWriterQueue)
      .leftJoin(
        newsRssArticles,
        eq(newsRssArticles.id, rssAutoWriterQueue.rssArticleId),
      )
      .leftJoin(articles, eq(articles.id, rssAutoWriterQueue.articleId))
      .orderBy(desc(rssAutoWriterQueue.updatedAt))
      .limit(80),
    db
      .select({
        status: rssAutoWriterQueue.status,
        count: sql<number>`count(*)::int`,
      })
      .from(rssAutoWriterQueue)
      .groupBy(rssAutoWriterQueue.status),
  ]);

  const queueStats = {
    queued: 0,
    processing: 0,
    failed: 0,
    done: 0,
    skipped: 0,
  };
  for (const row of statusCounts) {
    if (row.status === "queued") queueStats.queued = row.count;
    if (row.status === "processing") queueStats.processing = row.count;
    if (row.status === "failed") queueStats.failed = row.count;
    if (row.status === "done") queueStats.done = row.count;
    if (row.status === "skipped") queueStats.skipped = row.count;
  }

  return NextResponse.json({
    queueStats,
    items: queueRows.map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
      updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
      lockedAt: row.lockedAt?.toISOString?.() ?? null,
      processedAt: row.processedAt?.toISOString?.() ?? null,
    })),
  });
}
