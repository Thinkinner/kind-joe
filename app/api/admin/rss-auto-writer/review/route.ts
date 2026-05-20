import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, rssAutoWriterQueue } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { ensureCmsUser } from "@/lib/cms/ensure-cms-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asAction(value: unknown): "approve" | "reject" | null {
  if (value === "approve" || value === "reject") return value;
  return null;
}

const SOURCE_TYPE = "news_rss_articles";

export async function GET(request: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ARTICLES);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get("limit") || "30");
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : 30, 1), 100);

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImageUrl: articles.coverImageUrl,
      authorId: articles.authorId,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      sourceUrl: sql<string | null>`${articles.seo}->>'sourceUrl'`,
      sourceName: sql<string | null>`${articles.seo}->>'sourceName'`,
    })
    .from(articles)
    .where(
      and(
        eq(articles.isDraft, true),
        isNull(articles.deletedAt),
        sql`coalesce(${articles.seo}->>'sourceType','') = ${SOURCE_TYPE}`,
      ),
    )
    .orderBy(desc(articles.updatedAt))
    .limit(limit);

  const queueStatusRows = await db
    .select({
      status: rssAutoWriterQueue.status,
      count: sql<number>`count(*)::int`,
    })
    .from(rssAutoWriterQueue)
    .groupBy(rssAutoWriterQueue.status);
  const queueStats = {
    queued: 0,
    processing: 0,
    failed: 0,
    done: 0,
    skipped: 0,
  };
  for (const row of queueStatusRows) {
    if (row.status === "queued") queueStats.queued = row.count;
    if (row.status === "processing") queueStats.processing = row.count;
    if (row.status === "failed") queueStats.failed = row.count;
    if (row.status === "done") queueStats.done = row.count;
    if (row.status === "skipped") queueStats.skipped = row.count;
  }

  return NextResponse.json({
    items: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
      updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
    })),
    queueStats,
  });
}

export async function POST(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ARTICLES);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    articleId?: unknown;
    action?: unknown;
  };
  const articleId = typeof body.articleId === "string" ? body.articleId.trim() : "";
  const action = asAction(body.action);

  if (!articleId || !action) {
    return NextResponse.json(
      { error: "articleId and action are required." },
      { status: 400 },
    );
  }

  const now = new Date();
  const user = staff.user;
  await ensureCmsUser({
    id: user.id,
    name: user.name || user.email || "Staff",
    avatarUrl: user.image,
  });

  const [row] = await db
    .select({
      id: articles.id,
      isDraft: articles.isDraft,
      deletedAt: articles.deletedAt,
      sourceType: sql<string | null>`${articles.seo}->>'sourceType'`,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!row || row.deletedAt || !row.isDraft || row.sourceType !== SOURCE_TYPE) {
    return NextResponse.json(
      { error: "Draft not found in auto-writer queue." },
      { status: 404 },
    );
  }

  if (action === "approve") {
    await db
      .update(articles)
      .set({
        isDraft: false,
        authorId: user.id,
        publishedBy: user.id,
        publishedAt: now,
        publishAt: null,
        updatedAt: now,
      })
      .where(eq(articles.id, articleId));
    return NextResponse.json({ success: true, action: "approved" });
  }

  await db
    .update(articles)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(articles.id, articleId));
  return NextResponse.json({ success: true, action: "rejected" });
}
