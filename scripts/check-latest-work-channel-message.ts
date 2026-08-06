import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { staffDutyCheckins, staffSlackLinks } from "../db/schema";
import { user as authUser } from "../db/auth-schema";
import {
  dutyDatesForIdleNudge,
  fetchLastMessageAtByUserInChannel,
} from "../lib/admin/idle-nudge";
import {
  getIdleNudgeTiming,
  getSlackWorkChannelId,
} from "../lib/admin/slack-link-assign-settings";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function botToken() {
  return (
    process.env.KJ_LINK_ASSIGN_SLACK_BOT_TOKEN?.trim() ||
    process.env.KJ_SUPPORT_SLACK_BOT_TOKEN?.trim() ||
    ""
  );
}

async function main() {
  const now = new Date();
  const channelId = await getSlackWorkChannelId();
  const token = botToken();
  if (!channelId) throw new Error("no_work_channel");
  if (!token) throw new Error("no_bot_token");

  const dutyDates = dutyDatesForIdleNudge(now);
  const timing = await getIdleNudgeTiming();

  const rows = await db
    .select({
      userId: staffDutyCheckins.userId,
      slackUserId: staffSlackLinks.slackUserId,
      name: authUser.name,
      email: authUser.email,
    })
    .from(staffDutyCheckins)
    .leftJoin(
      staffSlackLinks,
      eq(staffSlackLinks.userId, staffDutyCheckins.userId),
    )
    .leftJoin(authUser, eq(authUser.id, staffDutyCheckins.userId))
    .where(
      and(
        inArray(staffDutyCheckins.dutyDate, dutyDates),
        eq(staffDutyCheckins.workingToday, true),
        eq(staffDutyCheckins.workingKindJoe, true),
      ),
    );

  const bySlack = new Map<
    string,
    { userId: string; name: string | null; email: string | null }
  >();
  for (const row of rows) {
    const sid = row.slackUserId?.trim();
    if (!sid) continue;
    bySlack.set(sid, {
      userId: row.userId,
      name: row.name ?? null,
      email: row.email ?? null,
    });
  }

  // Broader lookback so we can still find the latest poster even if not checked in.
  const oldestUnix = Math.floor((now.getTime() - 48 * 60 * 60 * 1000) / 1000);
  const history = await fetchLastMessageAtByUserInChannel({
    token,
    channelId,
    oldestUnix,
    relevantUserIds: new Set(), // all human posters
  });

  if (history.error) {
    console.log(JSON.stringify({ ok: false, error: history.error }, null, 2));
    process.exit(1);
  }

  let latest: { slackUserId: string; at: Date } | null = null;
  for (const [slackUserId, at] of history.byUser) {
    if (!latest || at > latest.at) latest = { slackUserId, at };
  }

  if (!latest) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          channelIdSet: true,
          scanned: history.scanned,
          usersFound: history.byUser.size,
          latest: null,
          note: "No human messages found in the last 48h lookback.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const minutesAgo = Math.max(
    0,
    Math.round((now.getTime() - latest.at.getTime()) / 60000),
  );
  const mapped = bySlack.get(latest.slackUserId) ?? null;

  const all = [...history.byUser.entries()]
    .map(([slackUserId, at]) => {
      const m = bySlack.get(slackUserId);
      return {
        slackUserId,
        name: m?.name ?? null,
        email: m?.email ?? null,
        checkedInKindJoe: Boolean(m),
        lastMessageAt: at.toISOString(),
        minutesAgo: Math.max(
          0,
          Math.round((now.getTime() - at.getTime()) / 60000),
        ),
      };
    })
    .sort((a, b) => a.minutesAgo - b.minutesAgo);

  console.log(
    JSON.stringify(
      {
        ok: true,
        now: now.toISOString(),
        idleAfterMinutes: Math.round(timing.idleAfterSeconds / 60),
        scanned: history.scanned,
        usersFound: history.byUser.size,
        latest: {
          slackUserId: latest.slackUserId,
          name: mapped?.name ?? "(not mapped to a Kind Joe staff Slack ID)",
          email: mapped?.email ?? null,
          checkedInKindJoe: Boolean(mapped),
          lastMessageAt: latest.at.toISOString(),
          minutesAgo,
        },
        recentPosters: all.slice(0, 10),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
