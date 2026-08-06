import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { staffDutyCheckins, staffSlackLinks } from "@/db/schema";
import { dutyDateInLA } from "@/lib/admin/duty-date";
import {
  getIdleNudgeTiming,
  getSlackWorkChannelId,
} from "@/lib/admin/slack-link-assign-settings";

/** Subtypes that still count as someone posting content in the work channel. */
const CONTENT_SUBTYPES = new Set(["file_share", "thread_broadcast"]);

export async function recordStaffSlackContentActivity(slackUserId: string) {
  const normalized = slackUserId.trim();
  if (!normalized) return null;

  const [link] = await db
    .select()
    .from(staffSlackLinks)
    .where(eq(staffSlackLinks.slackUserId, normalized))
    .limit(1);

  if (!link) return null;

  const dutyDate = dutyDateInLA();
  const now = new Date();

  const [updated] = await db
    .update(staffDutyCheckins)
    .set({
      lastContentAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(staffDutyCheckins.userId, link.userId),
        eq(staffDutyCheckins.dutyDate, dutyDate),
        eq(staffDutyCheckins.workingToday, true),
        eq(staffDutyCheckins.workingKindJoe, true),
      ),
    )
    .returning();

  return updated ?? null;
}

function getBotToken() {
  return (
    process.env.KJ_LINK_ASSIGN_SLACK_BOT_TOKEN?.trim() ||
    process.env.KJ_SUPPORT_SLACK_BOT_TOKEN?.trim() ||
    ""
  );
}

async function postSlackMessage(input: {
  token: string;
  channel: string;
  text: string;
}) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      channel: input.channel,
      text: input.text,
      link_names: true,
    }),
  });
  return (await res.json()) as { ok?: boolean; error?: string; ts?: string };
}

function formatIdleDuration(ms: number) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function slackTsToDate(ts: string): Date | null {
  const seconds = Number.parseFloat(ts);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000);
}

function isHumanContentMessage(msg: {
  user?: string;
  bot_id?: string;
  subtype?: string;
  ts?: string;
}) {
  if (!msg.user || !msg.ts || msg.bot_id) return false;
  if (msg.subtype && !CONTENT_SUBTYPES.has(msg.subtype)) return false;
  return true;
}

/**
 * Read the work channel and return each user's latest human message time.
 * Uses conversations.history (bot needs channels:history / groups:history).
 */
export async function fetchLastMessageAtByUserInChannel(input: {
  token: string;
  channelId: string;
  /** Unix seconds — don't fetch older than this. */
  oldestUnix: number;
  relevantUserIds: Set<string>;
}): Promise<{ byUser: Map<string, Date>; error?: string; scanned: number }> {
  const byUser = new Map<string, Date>();
  let cursor: string | undefined;
  let scanned = 0;
  const maxPages = 20;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      channel: input.channelId,
      oldest: String(input.oldestUnix),
      limit: "200",
      inclusive: "true",
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(
      `https://slack.com/api/conversations.history?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${input.token}` },
        cache: "no-store",
      },
    );
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      messages?: Array<{
        user?: string;
        bot_id?: string;
        subtype?: string;
        ts?: string;
      }>;
      response_metadata?: { next_cursor?: string };
      has_more?: boolean;
    };

    if (!data.ok) {
      return {
        byUser,
        scanned,
        error: data.error ?? "conversations_history_failed",
      };
    }

    for (const msg of data.messages ?? []) {
      scanned += 1;
      if (!isHumanContentMessage(msg) || !msg.user || !msg.ts) continue;
      if (
        input.relevantUserIds.size > 0 &&
        !input.relevantUserIds.has(msg.user)
      ) {
        continue;
      }
      const at = slackTsToDate(msg.ts);
      if (!at) continue;
      const prev = byUser.get(msg.user);
      if (!prev || at > prev) byUser.set(msg.user, at);
    }

    const next = data.response_metadata?.next_cursor?.trim();
    if (!data.has_more || !next) break;
    cursor = next;
  }

  return { byUser, scanned };
}

/**
 * Nudge Kind Joe staff whose last message in the work channel
 * is older than the configured idle duration.
 */
export async function runIdleNudgeCheck(now = new Date()) {
  const channelId = await getSlackWorkChannelId();
  const botToken = getBotToken();
  const timing = await getIdleNudgeTiming();
  const dutyDate = dutyDateInLA(now);
  const idleAfterMs = timing.idleAfterSeconds * 1000;
  const cooldownMs = timing.idleCooldownSeconds * 1000;

  if (!channelId) {
    return {
      ok: false as const,
      reason: "no_work_channel" as const,
      nudged: [] as string[],
    };
  }
  if (!botToken) {
    return {
      ok: false as const,
      reason: "no_bot_token" as const,
      nudged: [] as string[],
    };
  }

  const rows = await db
    .select({
      id: staffDutyCheckins.id,
      userId: staffDutyCheckins.userId,
      checkedInAt: staffDutyCheckins.checkedInAt,
      lastContentAt: staffDutyCheckins.lastContentAt,
      lastNudgeAt: staffDutyCheckins.lastNudgeAt,
      slackUserId: staffSlackLinks.slackUserId,
    })
    .from(staffDutyCheckins)
    .leftJoin(
      staffSlackLinks,
      eq(staffSlackLinks.userId, staffDutyCheckins.userId),
    )
    .where(
      and(
        eq(staffDutyCheckins.dutyDate, dutyDate),
        eq(staffDutyCheckins.workingToday, true),
        eq(staffDutyCheckins.workingKindJoe, true),
      ),
    );

  const relevantUserIds = new Set(
    rows
      .map((r) => r.slackUserId?.trim())
      .filter((id): id is string => Boolean(id)),
  );

  // Look back at least to earliest check-in (or idle window), so "no message"
  // really means they haven't posted since they checked in.
  const earliestCheckInMs = rows.reduce((min, row) => {
    const t = new Date(row.checkedInAt).getTime();
    return Number.isFinite(t) ? Math.min(min, t) : min;
  }, now.getTime());
  const lookbackMs = Math.max(
    now.getTime() - earliestCheckInMs,
    idleAfterMs,
    60 * 60 * 1000,
  );
  const oldestUnix = Math.floor((now.getTime() - lookbackMs) / 1000);

  const history = await fetchLastMessageAtByUserInChannel({
    token: botToken,
    channelId,
    oldestUnix,
    relevantUserIds,
  });

  if (history.error) {
    console.error("[idle-nudge] conversations.history failed", history.error);
    return {
      ok: false as const,
      reason: "slack_history_failed" as const,
      slackError: history.error,
      nudged: [] as string[],
    };
  }

  const skipped: Array<{ userId: string; reason: string }> = [];
  type Candidate = {
    row: (typeof rows)[number];
    slackUserId: string;
    lastMessageAt: Date | null;
    lastActive: Date;
    idleMs: number;
  };
  const candidates: Candidate[] = [];

  for (const row of rows) {
    if (!row.slackUserId) {
      skipped.push({ userId: row.userId, reason: "no_slack_id" });
      continue;
    }

    // Source of truth: that person's latest human message in THIS work channel.
    const lastMessageAt = history.byUser.get(row.slackUserId) ?? null;
    const lastActive = lastMessageAt ?? new Date(row.checkedInAt);

    if (
      lastMessageAt &&
      (!row.lastContentAt ||
        lastMessageAt.getTime() > new Date(row.lastContentAt).getTime())
    ) {
      await db
        .update(staffDutyCheckins)
        .set({
          lastContentAt: lastMessageAt,
          updatedAt: now,
        })
        .where(eq(staffDutyCheckins.id, row.id));
    }

    const idleMs = now.getTime() - lastActive.getTime();
    if (idleMs < idleAfterMs) {
      skipped.push({ userId: row.userId, reason: "not_idle_yet" });
      continue;
    }

    if (row.lastNudgeAt) {
      const sinceNudge = now.getTime() - new Date(row.lastNudgeAt).getTime();
      if (sinceNudge < cooldownMs) {
        skipped.push({ userId: row.userId, reason: "nudge_cooldown" });
        continue;
      }
    }

    candidates.push({
      row,
      slackUserId: row.slackUserId,
      lastMessageAt,
      lastActive,
      idleMs,
    });
  }

  // One mention per check: only the single longest-idle person.
  candidates.sort((a, b) => b.idleMs - a.idleMs);
  const pick = candidates[0] ?? null;
  for (const extra of candidates.slice(1)) {
    skipped.push({ userId: extra.row.userId, reason: "waiting_turn" });
  }

  const nudged: string[] = [];

  if (pick) {
    const text = `<@${pick.slackUserId}> hey — it's been about ${formatIdleDuration(pick.idleMs)} since your last message in this channel. What are you working on?`;

    const posted = await postSlackMessage({
      token: botToken,
      channel: channelId,
      text,
    });

    if (!posted.ok) {
      console.error("[idle-nudge] slack post failed", posted);
      skipped.push({
        userId: pick.row.userId,
        reason: posted.error ?? "slack_error",
      });
    } else {
      await db
        .update(staffDutyCheckins)
        .set({
          lastNudgeAt: now,
          updatedAt: now,
        })
        .where(eq(staffDutyCheckins.id, pick.row.id));

      nudged.push(pick.row.userId);
    }
  }

  return {
    ok: true as const,
    dutyDate,
    channelId,
    idleAfterSeconds: timing.idleAfterSeconds,
    idleCooldownSeconds: timing.idleCooldownSeconds,
    historyScanned: history.scanned,
    historyUsersFound: history.byUser.size,
    checked: rows.length,
    eligible: candidates.length,
    nudged,
    skipped,
  };
}
