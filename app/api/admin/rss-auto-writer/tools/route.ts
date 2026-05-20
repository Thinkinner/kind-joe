import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rssAutoWriterQueue } from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readQueueStats() {
  const rows = await db
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
  for (const row of rows) {
    if (row.status === "queued") queueStats.queued = row.count;
    if (row.status === "processing") queueStats.processing = row.count;
    if (row.status === "failed") queueStats.failed = row.count;
    if (row.status === "done") queueStats.done = row.count;
    if (row.status === "skipped") queueStats.skipped = row.count;
  }
  return queueStats;
}

export async function POST(request: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    hours?: number;
  };
  const action = (body.action || "").trim();
  const now = new Date();

  if (action === "retry_failed") {
    const updated = await db
      .update(rssAutoWriterQueue)
      .set({
        status: "queued",
        lastError: null,
        lockedAt: null,
        processedAt: null,
        attemptCount: 0,
        updatedAt: now,
      })
      .where(eq(rssAutoWriterQueue.status, "failed"))
      .returning({ id: rssAutoWriterQueue.id });

    return NextResponse.json({
      success: true,
      action,
      affected: updated.length,
      queueStats: await readQueueStats(),
    });
  }

  if (action === "release_processing") {
    const staleMinutes = 30;
    const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
    const updated = await db
      .update(rssAutoWriterQueue)
      .set({
        status: "queued",
        lockedAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(rssAutoWriterQueue.status, "processing"),
          lt(rssAutoWriterQueue.lockedAt, staleCutoff),
        ),
      )
      .returning({ id: rssAutoWriterQueue.id });

    return NextResponse.json({
      success: true,
      action,
      affected: updated.length,
      queueStats: await readQueueStats(),
    });
  }

  if (action === "clear_completed") {
    const keepHours = Math.min(Math.max(Math.trunc(body.hours || 24), 1), 24 * 30);
    const cutoff = new Date(Date.now() - keepHours * 60 * 60 * 1000);
    const deleted = await db
      .delete(rssAutoWriterQueue)
      .where(
        and(
          inArray(rssAutoWriterQueue.status, ["done", "skipped"]),
          lt(rssAutoWriterQueue.updatedAt, cutoff),
        ),
      )
      .returning({ id: rssAutoWriterQueue.id });

    return NextResponse.json({
      success: true,
      action,
      affected: deleted.length,
      queueStats: await readQueueStats(),
    });
  }

  return NextResponse.json(
    { success: false, error: "Unsupported action." },
    { status: 400 },
  );
}
