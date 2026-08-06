import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { staffDutyCheckins, staffSlackLinks } from "@/db/schema";
import { dutyDateInLA } from "@/lib/admin/duty-date";
import {
  getIdleNudgeTiming,
  getSlackWorkChannelId,
} from "@/lib/admin/slack-link-assign-settings";

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

/**
 * Nudge Kind Joe staff who haven't posted in the work channel
 * for the configured idle duration.
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

  const nudged: string[] = [];
  const skipped: Array<{ userId: string; reason: string }> = [];

  for (const row of rows) {
    if (!row.slackUserId) {
      skipped.push({ userId: row.userId, reason: "no_slack_id" });
      continue;
    }

    const lastActive = row.lastContentAt ?? row.checkedInAt;
    const idleMs = now.getTime() - new Date(lastActive).getTime();
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

    const text = `<@${row.slackUserId}> hey — it's been about ${formatIdleDuration(idleMs)} since your last carousel/content post. What are you working on?`;

    const posted = await postSlackMessage({
      token: botToken,
      channel: channelId,
      text,
    });

    if (!posted.ok) {
      console.error("[idle-nudge] slack post failed", posted);
      skipped.push({
        userId: row.userId,
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
      .where(eq(staffDutyCheckins.id, row.id));

    nudged.push(row.userId);
  }

  return {
    ok: true as const,
    dutyDate,
    channelId,
    idleAfterSeconds: timing.idleAfterSeconds,
    idleCooldownSeconds: timing.idleCooldownSeconds,
    checked: rows.length,
    nudged,
    skipped,
  };
}
