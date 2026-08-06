import { config } from "dotenv";
import {
  isIdleNudgeActiveWindow,
  runIdleNudgeCheck,
} from "../lib/admin/idle-nudge";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const now = new Date();
  const win = isIdleNudgeActiveWindow(now);
  const result = await runIdleNudgeCheck({ dryRun: true, now });

  const wouldNudge =
    "wouldNudge" in result
      ? result.wouldNudge.map((w) => ({
          userId: `${w.userId.slice(0, 8)}…`,
          slackUserId: w.slackUserId,
          duration: w.duration,
          lastMessageAt: w.lastMessageAt,
          textPreview: w.text.replace(/<@[^>]+>/, "<@…>"),
        }))
      : [];

  const skipped =
    "skipped" in result
      ? result.skipped.map((s) => ({
          userId: `${s.userId.slice(0, 8)}…`,
          reason: s.reason,
        }))
      : [];

  console.log(
    JSON.stringify(
      {
        now: now.toISOString(),
        manilaWindow: win,
        dryRun: true,
        ok: result.ok,
        reason: "reason" in result ? result.reason : undefined,
        slackError: "slackError" in result ? result.slackError : undefined,
        dutyDates: "dutyDates" in result ? result.dutyDates : undefined,
        channelIdSet: Boolean(
          "channelId" in result ? result.channelId : false,
        ),
        idleAfterSeconds:
          "idleAfterSeconds" in result ? result.idleAfterSeconds : undefined,
        idleCooldownSeconds:
          "idleCooldownSeconds" in result
            ? result.idleCooldownSeconds
            : undefined,
        checked: "checked" in result ? result.checked : undefined,
        eligible: "eligible" in result ? result.eligible : undefined,
        historyScanned:
          "historyScanned" in result ? result.historyScanned : undefined,
        historyUsersFound:
          "historyUsersFound" in result ? result.historyUsersFound : undefined,
        messagesThatWouldSend: wouldNudge.length,
        wouldNudge,
        skipped,
        nudgedActuallySent: "nudged" in result ? result.nudged.length : 0,
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
