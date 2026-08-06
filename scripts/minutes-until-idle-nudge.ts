import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { user as authUser } from "../db/auth-schema";
import { staffDutyCheckins, staffSlackLinks } from "../db/schema";
import {
  dutyDatesForIdleNudge,
  fetchLastMessageAtByUserInChannel,
  isIdleNudgeActiveWindow,
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

function minutesUntilNextIdleCron(now: Date): number | null {
  // vercel: */5 15-22 * * *  (UTC)
  const h = now.getUTCHours();
  const m = now.getUTCMinutes();
  const s = now.getUTCSeconds();
  if (h < 15 || h > 22) return null;
  if (h === 22 && m >= 55) {
    // last slot at 22:55; after that no more until next day 15:00
    if (m > 55 || (m === 55 && s > 0)) return null;
  }
  const nextFive = (Math.floor(m / 5) + 1) * 5;
  if (nextFive < 60) {
    return nextFive - m;
  }
  if (h < 22) return 60 - m;
  return null;
}

async function main() {
  const now = new Date();
  const win = isIdleNudgeActiveWindow(now);
  const timing = await getIdleNudgeTiming();
  const channelId = await getSlackWorkChannelId();
  const token = botToken();
  if (!channelId || !token) {
    console.log(JSON.stringify({ error: "missing channel or token" }));
    process.exit(1);
  }

  const dutyDates = dutyDatesForIdleNudge(now);
  const links = await db
    .select({
      userId: staffDutyCheckins.userId,
      slackUserId: staffSlackLinks.slackUserId,
      lastNudgeAt: staffDutyCheckins.lastNudgeAt,
      name: authUser.name,
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

  const history = await fetchLastMessageAtByUserInChannel({
    token,
    channelId,
    oldestUnix: Math.floor((now.getTime() - 48 * 60 * 60 * 1000) / 1000),
    relevantUserIds: new Set(),
  });

  let latest: { slackUserId: string; at: Date } | null = null;
  for (const [slackUserId, at] of history.byUser) {
    if (!latest || at > latest.at) latest = { slackUserId, at };
  }

  if (!latest) {
    console.log(JSON.stringify({ ok: true, latest: null }, null, 2));
    return;
  }

  const minutesSince = (now.getTime() - latest.at.getTime()) / 60000;
  const idleAfterMin = timing.idleAfterSeconds / 60;
  const minutesUntilEligible = Math.max(0, idleAfterMin - minutesSince);

  const person = links.find(
    (l) => l.slackUserId?.trim() === latest.slackUserId,
  );
  let cooldownLeftMin = 0;
  if (person?.lastNudgeAt) {
    const sinceNudge =
      (now.getTime() - new Date(person.lastNudgeAt).getTime()) / 60000;
    cooldownLeftMin = Math.max(
      0,
      timing.idleCooldownSeconds / 60 - sinceNudge,
    );
  }

  const waitForIdle = minutesUntilEligible;
  const waitForCooldown = cooldownLeftMin;
  const minutesUntilCanNudge = Math.max(waitForIdle, waitForCooldown);
  const minsToCron = minutesUntilNextIdleCron(now);

  // After eligible, next cron tick is when it would actually send
  let minutesUntilSend: number | null = null;
  let note = "";
  if (!win.active) {
    minutesUntilSend = null;
    note = "Outside 11pm–7am PHT window — no send until window opens.";
  } else if (minutesUntilCanNudge > 0) {
    // become eligible in X min, then wait for next cron after that
    const eligibleAt = new Date(
      now.getTime() + minutesUntilCanNudge * 60000,
    );
    const cronAfterEligible = minutesUntilNextIdleCron(eligibleAt);
    minutesUntilSend =
      minutesUntilCanNudge + (cronAfterEligible ?? 0);
    note =
      cronAfterEligible == null
        ? "Eligible before/near end of cron window; may miss tonight's last ticks."
        : "Eligible after idle/cooldown, then next cron tick.";
  } else {
    minutesUntilSend = minsToCron ?? 0;
    note = "Already eligible — next cron tick should send.";
  }

  console.log(
    JSON.stringify(
      {
        now: now.toISOString(),
        manilaHour: win.hour,
        windowActive: win.active,
        person: person?.name ?? "(unmapped)",
        slackUserId: latest.slackUserId,
        minutesSinceLastMessage: Math.round(minutesSince * 10) / 10,
        idleAfterMinutes: idleAfterMin,
        minutesUntilIdleThreshold: Math.round(minutesUntilEligible * 10) / 10,
        cooldownMinutesLeft: Math.round(cooldownLeftMin * 10) / 10,
        minutesUntilNextCron: minsToCron,
        minutesUntilNotifierLikelySends:
          minutesUntilSend == null
            ? null
            : Math.round(minutesUntilSend * 10) / 10,
        note,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
