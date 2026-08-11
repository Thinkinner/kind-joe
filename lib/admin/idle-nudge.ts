import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { staffDutyCheckins, staffSlackLinks } from "@/db/schema";
import {
  dutyDatesForOpsWindow,
  listActiveKindJoeDutyStaff,
} from "@/lib/admin/kindjoe-duty-staff";
import {
  getIdleNudgeTiming,
  getSlackWorkChannelId,
} from "@/lib/admin/slack-link-assign-settings";

/** Idle nudges only run overnight in Philippines time. */
export const IDLE_NUDGE_TIMEZONE = "Asia/Manila";
/** Inclusive start hour (21 = 9:00 PM). */
export const IDLE_NUDGE_ACTIVE_START_HOUR = 21;
/** Exclusive end hour (7 = 7:00 AM). Active while hour is 21–23 or 0–6. */
export const IDLE_NUDGE_ACTIVE_END_HOUR = 7;
/**
 * Vercel cron for idle nudge: every 5 minutes, UTC hours 13-22
 * (= 9:00 PM–6:59 AM Asia/Manila).
 */
export const IDLE_NUDGE_CRON_UTC_START_HOUR = 13;
export const IDLE_NUDGE_CRON_UTC_END_HOUR = 22;

/** Subtypes that still count as someone posting content in the work channel. */
const CONTENT_SUBTYPES = new Set(["file_share", "thread_broadcast"]);

/** True only between 9:00 PM and 7:00 AM Asia/Manila. */
export function isIdleNudgeActiveWindow(now = new Date()): {
  active: boolean;
  hour: number;
  timeZone: string;
} {
  const hourRaw = new Intl.DateTimeFormat("en-US", {
    timeZone: IDLE_NUDGE_TIMEZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  let hour = Number.parseInt(hourRaw, 10);
  if (!Number.isFinite(hour)) hour = -1;
  if (hour === 24) hour = 0;

  const active =
    hour >= IDLE_NUDGE_ACTIVE_START_HOUR || hour < IDLE_NUDGE_ACTIVE_END_HOUR;

  return { active, hour, timeZone: IDLE_NUDGE_TIMEZONE };
}

/**
 * Duty check-ins use LA calendar dates. During the PH overnight window the LA
 * "today" can lag, so include yesterday too so overnight staff still match.
 */
export function dutyDatesForIdleNudge(now = new Date()): string[] {
  return dutyDatesForOpsWindow(now).dates;
}

/** Minutes until the next Vercel idle-nudge cron tick (null if outside cron hours). */
export function minutesUntilNextIdleCron(now = new Date()): number | null {
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const s = now.getUTCSeconds();
  if (h < IDLE_NUDGE_CRON_UTC_START_HOUR || h > IDLE_NUDGE_CRON_UTC_END_HOUR) {
    return null;
  }
  if (h === IDLE_NUDGE_CRON_UTC_END_HOUR && m >= 55) {
    if (m > 55 || (m === 55 && s > 0)) return null;
  }
  const nextFive = (Math.floor(m / 5) + 1) * 5;
  if (nextFive < 60) return Math.max(0, nextFive - m);
  if (h < IDLE_NUDGE_CRON_UTC_END_HOUR) return Math.max(1, 60 - m);
  return null;
}

/** Next moment the 9PM–7AM Manila window is active (now if already active). */
export function nextIdleWindowStart(now = new Date()): Date {
  if (isIdleNudgeActiveWindow(now).active) return now;
  for (let minute = 1; minute <= 24 * 60; minute++) {
    const t = new Date(now.getTime() + minute * 60_000);
    if (isIdleNudgeActiveWindow(t).active) return t;
  }
  return now;
}

export function minutesUntilIdleWindowOpens(now = new Date()): number {
  if (isIdleNudgeActiveWindow(now).active) return 0;
  const start = nextIdleWindowStart(now);
  return Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 60_000));
}

export type IdleMentionCountdown = {
  minutesUntilMention: number | null;
  label: string;
  reason:
    | "outside_window"
    | "no_slack"
    | "no_message"
    | "waiting_idle"
    | "waiting_cooldown"
    | "eligible_soon";
};

/** Estimate when this person would be @mentioned next (DB lastContentAt based). */
export function computeIdleMentionCountdown(input: {
  now?: Date;
  lastContentAt: Date | string | null;
  lastNudgeAt: Date | string | null;
  slackUserId: string | null;
  idleAfterSeconds: number;
  idleCooldownSeconds: number;
}): IdleMentionCountdown {
  const now = input.now ?? new Date();
  const window = isIdleNudgeActiveWindow(now);
  const idleAfterMs = input.idleAfterSeconds * 1000;
  const cooldownMs = input.idleCooldownSeconds * 1000;

  if (!input.slackUserId?.trim()) {
    return {
      minutesUntilMention: null,
      label: "No Slack link",
      reason: "no_slack",
    };
  }

  const lastContentAt = input.lastContentAt
    ? new Date(input.lastContentAt)
    : null;
  if (!lastContentAt || Number.isNaN(lastContentAt.getTime())) {
    return {
      minutesUntilMention: null,
      label: "Needs a work-channel message first",
      reason: "no_message",
    };
  }

  const idleMs = now.getTime() - lastContentAt.getTime();
  const minutesUntilIdle = Math.max(
    0,
    Math.ceil((idleAfterMs - idleMs) / 60_000),
  );

  let minutesUntilCooldown = 0;
  if (input.lastNudgeAt) {
    const lastNudgeAt = new Date(input.lastNudgeAt);
    if (!Number.isNaN(lastNudgeAt.getTime())) {
      const sinceNudge = now.getTime() - lastNudgeAt.getTime();
      minutesUntilCooldown = Math.max(
        0,
        Math.ceil((cooldownMs - sinceNudge) / 60_000),
      );
    }
  }

  const minutesUntilEligible = Math.max(minutesUntilIdle, minutesUntilCooldown);
  const reason: IdleMentionCountdown["reason"] =
    minutesUntilCooldown > minutesUntilIdle && minutesUntilCooldown > 0
      ? "waiting_cooldown"
      : minutesUntilIdle > 0
        ? "waiting_idle"
        : "eligible_soon";

  if (!window.active) {
    const untilWindow = minutesUntilIdleWindowOpens(now);
    const afterOpen = Math.max(minutesUntilEligible, 0);
    // After window opens, wait for eligibility then next cron (~0–5m).
    const total = untilWindow + afterOpen;
    return {
      minutesUntilMention: total,
      label:
        afterOpen > 0
          ? `Window in ${untilWindow}m · then ~${afterOpen}m`
          : `Window opens in ${untilWindow}m`,
      reason: "outside_window",
    };
  }

  const cronAfterEligible =
    minutesUntilEligible > 0
      ? minutesUntilNextIdleCron(
          new Date(now.getTime() + minutesUntilEligible * 60_000),
        )
      : minutesUntilNextIdleCron(now);

  const minutesUntilMention =
    minutesUntilEligible + (cronAfterEligible ?? 0);

  if (minutesUntilEligible <= 0) {
    return {
      minutesUntilMention: cronAfterEligible ?? 0,
      label:
        cronAfterEligible == null
          ? "Eligible (waiting for cron window)"
          : `~${cronAfterEligible}m until mention`,
      reason: "eligible_soon",
    };
  }

  return {
    minutesUntilMention,
    label:
      reason === "waiting_cooldown"
        ? `${minutesUntilCooldown}m cooldown left`
        : `${minutesUntilIdle}m until idle threshold`,
    reason,
  };
}

export async function getIdleMentionCountdownsForStaff(
  people: Array<{
    userId: string;
    slackUserId: string | null;
    lastContentAt: string | Date | null;
    lastNudgeAt: string | Date | null;
    status: string;
  }>,
  now = new Date(),
): Promise<{
  windowActive: boolean;
  manilaHour: number;
  minutesUntilWindowOpens: number;
  minutesUntilNextCron: number | null;
  idleAfterMinutes: number;
  idleCooldownMinutes: number;
  byUserId: Record<string, IdleMentionCountdown>;
}> {
  const timing = await getIdleNudgeTiming();
  const window = isIdleNudgeActiveWindow(now);
  const byUserId: Record<string, IdleMentionCountdown> = {};

  for (const person of people) {
    if (person.status !== "kindjoe") continue;
    byUserId[person.userId] = computeIdleMentionCountdown({
      now,
      lastContentAt: person.lastContentAt,
      lastNudgeAt: person.lastNudgeAt,
      slackUserId: person.slackUserId,
      idleAfterSeconds: timing.idleAfterSeconds,
      idleCooldownSeconds: timing.idleCooldownSeconds,
    });
  }

  return {
    windowActive: window.active,
    manilaHour: window.hour,
    minutesUntilWindowOpens: minutesUntilIdleWindowOpens(now),
    minutesUntilNextCron: minutesUntilNextIdleCron(now),
    idleAfterMinutes: Math.round(timing.idleAfterSeconds / 60),
    idleCooldownMinutes: Math.round(timing.idleCooldownSeconds / 60),
    byUserId,
  };
}

export async function recordStaffSlackContentActivity(slackUserId: string) {
  const normalized = slackUserId.trim();
  if (!normalized) return null;

  const [link] = await db
    .select()
    .from(staffSlackLinks)
    .where(eq(staffSlackLinks.slackUserId, normalized))
    .limit(1);

  if (!link) return null;

  const dutyDates = dutyDatesForIdleNudge();
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
        inArray(staffDutyCheckins.dutyDate, dutyDates),
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
      mrkdwn: true,
      link_names: true,
    }),
  });
  return (await res.json()) as { ok?: boolean; error?: string; ts?: string };
}

/** Human-readable idle gap for Slack mentions (always includes hours when >= 1h). */
export function formatIdleDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "some time";

  const totalSeconds = Math.max(1, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const dayPart =
    days > 0 ? `${days} day${days === 1 ? "" : "s"}` : null;
  const hourPart =
    hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : null;
  const minutePart =
    minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}` : null;

  if (dayPart && hourPart) return `${dayPart} and ${hourPart}`;
  if (dayPart) return dayPart;
  if (hourPart && minutePart && hours < 6) {
    return `${hourPart} and ${minutePart}`;
  }
  if (hourPart) return hourPart;
  if (minutePart) return minutePart;
  return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
}

function formatManilaTime(at: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: IDLE_NUDGE_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(at);
  } catch {
    return at.toISOString();
  }
}

function buildIdleNudgeText(input: {
  slackUserId: string;
  idleMs: number;
  lastMessageAt: Date;
}) {
  const duration = formatIdleDuration(input.idleMs);
  const lastSeen = formatManilaTime(input.lastMessageAt);
  return (
    `<@${input.slackUserId}> hey — it's been *${duration}* since your last ` +
    `message in this channel (last seen around ${lastSeen} PHT). ` +
    `What are you working on?`
  );
}

function slackTsToDate(ts: string): Date | null {
  const seconds = Number.parseFloat(ts);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const at = new Date(seconds * 1000);
  if (Number.isNaN(at.getTime())) return null;
  return at;
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

export type IdleNudgeCheckOptions = {
  now?: Date;
  /** If true: evaluate only — no Slack posts and no DB writes. */
  dryRun?: boolean;
};

/**
 * For each person who posted in the work/content channel: if their latest
 * message there is older than the configured duration (e.g. last msg 2:00,
 * now 4:00 with a 2h setting), @mention them with how long it's been.
 */
export async function runIdleNudgeCheck(
  nowOrOptions: Date | IdleNudgeCheckOptions = new Date(),
) {
  const options: IdleNudgeCheckOptions =
    nowOrOptions instanceof Date ? { now: nowOrOptions } : nowOrOptions;
  const now = options.now ?? new Date();
  const dryRun = Boolean(options.dryRun);

  const window = isIdleNudgeActiveWindow(now);
  if (!window.active) {
    return {
      ok: false as const,
      dryRun,
      reason: "outside_active_hours" as const,
      activeHours: "21:00–07:00 Asia/Manila",
      manilaHour: window.hour,
      nudged: [] as string[],
      wouldNudge: [] as Array<{
        userId: string;
        slackUserId: string;
        idleMs: number;
        duration: string;
        lastMessageAt: string;
        text: string;
      }>,
    };
  }

  const channelId = await getSlackWorkChannelId();
  const botToken = getBotToken();
  const timing = await getIdleNudgeTiming();
  const dutyDates = dutyDatesForIdleNudge(now);
  const idleAfterMs = timing.idleAfterSeconds * 1000;
  const cooldownMs = timing.idleCooldownSeconds * 1000;

  if (!channelId) {
    return {
      ok: false as const,
      dryRun,
      reason: "no_work_channel" as const,
      nudged: [] as string[],
      wouldNudge: [],
    };
  }
  if (!botToken) {
    return {
      ok: false as const,
      dryRun,
      reason: "no_bot_token" as const,
      nudged: [] as string[],
      wouldNudge: [],
    };
  }

  const rows = await listActiveKindJoeDutyStaff(now);

  const relevantUserIds = new Set(
    rows
      .map((r) => r.slackUserId?.trim())
      .filter((id): id is string => Boolean(id)),
  );

  // Look far enough back that we can see earlier posts from people in this channel.
  const earliestCheckInMs = rows.reduce((min, row) => {
    const t = new Date(row.checkedInAt).getTime();
    return Number.isFinite(t) ? Math.min(min, t) : min;
  }, now.getTime());
  const lookbackMs = Math.max(
    now.getTime() - earliestCheckInMs,
    idleAfterMs * 2,
    24 * 60 * 60 * 1000,
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
      dryRun,
      reason: "slack_history_failed" as const,
      slackError: history.error,
      nudged: [] as string[],
      wouldNudge: [],
    };
  }

  const skipped: Array<{ userId: string; reason: string }> = [];
  type Candidate = {
    row: (typeof rows)[number];
    slackUserId: string;
    lastMessageAt: Date;
    idleMs: number;
  };
  const candidates: Candidate[] = [];

  for (const row of rows) {
    if (!row.slackUserId) {
      skipped.push({ userId: row.userId, reason: "no_slack_id" });
      continue;
    }

    // Only people who actually posted in THIS work channel can be nudged.
    const lastMessageAt = history.byUser.get(row.slackUserId) ?? null;
    if (!lastMessageAt) {
      skipped.push({ userId: row.userId, reason: "no_message_in_channel" });
      continue;
    }

    if (
      !dryRun &&
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

    const msSinceLastMessage = now.getTime() - lastMessageAt.getTime();
    if (!Number.isFinite(msSinceLastMessage) || msSinceLastMessage < 0) {
      skipped.push({ userId: row.userId, reason: "invalid_idle_ms" });
      continue;
    }

    if (msSinceLastMessage < idleAfterMs) {
      skipped.push({ userId: row.userId, reason: "recent_message" });
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
      idleMs: msSinceLastMessage,
    });
  }

  candidates.sort((a, b) => b.idleMs - a.idleMs);

  const wouldNudge = candidates.map((pick) => {
    const text = buildIdleNudgeText({
      slackUserId: pick.slackUserId,
      idleMs: pick.idleMs,
      lastMessageAt: pick.lastMessageAt,
    });
    return {
      userId: pick.row.userId,
      slackUserId: pick.slackUserId,
      idleMs: pick.idleMs,
      duration: formatIdleDuration(pick.idleMs),
      lastMessageAt: pick.lastMessageAt.toISOString(),
      text,
    };
  });

  const nudged: string[] = [];
  const messages: Array<{ userId: string; text: string; idleMs: number }> = [];

  if (!dryRun) {
    for (const pick of candidates) {
      const planned = wouldNudge.find((w) => w.userId === pick.row.userId);
      const text =
        planned?.text ??
        buildIdleNudgeText({
          slackUserId: pick.slackUserId,
          idleMs: pick.idleMs,
          lastMessageAt: pick.lastMessageAt,
        });

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
        continue;
      }

      await db
        .update(staffDutyCheckins)
        .set({
          lastNudgeAt: now,
          updatedAt: now,
        })
        .where(eq(staffDutyCheckins.id, pick.row.id));

      nudged.push(pick.row.userId);
      messages.push({
        userId: pick.row.userId,
        text,
        idleMs: pick.idleMs,
      });
    }
  }

  return {
    ok: true as const,
    dryRun,
    dutyDates,
    channelId,
    idleAfterSeconds: timing.idleAfterSeconds,
    idleCooldownSeconds: timing.idleCooldownSeconds,
    historyScanned: history.scanned,
    historyUsersFound: history.byUser.size,
    checked: rows.length,
    eligible: candidates.length,
    nudged,
    wouldNudge,
    messages,
    skipped,
  };
}
