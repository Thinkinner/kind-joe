import { eq } from "drizzle-orm";
import { db } from "@/db";
import { slackLinkAssignSettings } from "@/db/schema";

const SETTINGS_ID = 1;

export const DEFAULT_IDLE_AFTER_SECONDS = 7200;
export const DEFAULT_IDLE_COOLDOWN_SECONDS = 7200;
/** 1 second … 7 days */
export const MIN_IDLE_SECONDS = 1;
export const MAX_IDLE_SECONDS = 7 * 24 * 60 * 60;

export async function getSlackLinkAssignChannelId(): Promise<string> {
  const [row] = await db
    .select({ channelId: slackLinkAssignSettings.channelId })
    .from(slackLinkAssignSettings)
    .where(eq(slackLinkAssignSettings.id, SETTINGS_ID))
    .limit(1);

  const fromDb = (row?.channelId ?? "").trim();
  if (fromDb) return fromDb;

  // Optional legacy fallback if someone still has env set
  return (process.env.KJ_LINK_ASSIGN_SLACK_CHANNEL_ID ?? "").trim();
}

/** Channel where staff post carousel/content (idle nudge watches this). */
export async function getSlackWorkChannelId(): Promise<string> {
  const [row] = await db
    .select({ workChannelId: slackLinkAssignSettings.workChannelId })
    .from(slackLinkAssignSettings)
    .where(eq(slackLinkAssignSettings.id, SETTINGS_ID))
    .limit(1);

  return (row?.workChannelId ?? "").trim();
}

export async function getIdleNudgeTiming() {
  const [row] = await db
    .select({
      idleAfterSeconds: slackLinkAssignSettings.idleAfterSeconds,
      idleCooldownSeconds: slackLinkAssignSettings.idleCooldownSeconds,
    })
    .from(slackLinkAssignSettings)
    .where(eq(slackLinkAssignSettings.id, SETTINGS_ID))
    .limit(1);

  return {
    idleAfterSeconds: clampIdleSeconds(
      row?.idleAfterSeconds ?? DEFAULT_IDLE_AFTER_SECONDS,
    ),
    idleCooldownSeconds: clampIdleSeconds(
      row?.idleCooldownSeconds ?? DEFAULT_IDLE_COOLDOWN_SECONDS,
    ),
  };
}

export function clampIdleSeconds(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_IDLE_AFTER_SECONDS;
  return Math.min(MAX_IDLE_SECONDS, Math.max(MIN_IDLE_SECONDS, Math.round(value)));
}

export async function getSlackLinkAssignSettings() {
  const [row] = await db
    .select()
    .from(slackLinkAssignSettings)
    .where(eq(slackLinkAssignSettings.id, SETTINGS_ID))
    .limit(1);

  if (row) return row;

  const [created] = await db
    .insert(slackLinkAssignSettings)
    .values({
      id: SETTINGS_ID,
      channelId: "",
      workChannelId: "",
      idleAfterSeconds: DEFAULT_IDLE_AFTER_SECONDS,
      idleCooldownSeconds: DEFAULT_IDLE_COOLDOWN_SECONDS,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [again] = await db
    .select()
    .from(slackLinkAssignSettings)
    .where(eq(slackLinkAssignSettings.id, SETTINGS_ID))
    .limit(1);
  return again ?? null;
}

function isSlackChannelId(value: string) {
  return !value || /^[CG][A-Z0-9]+$/i.test(value);
}

export async function saveSlackChannelSettings(input: {
  channelId: string;
  workChannelId: string;
  idleAfterSeconds: number;
  idleCooldownSeconds: number;
  updatedByUserId?: string | null;
}) {
  const channelId = input.channelId.trim();
  const workChannelId = input.workChannelId.trim();
  const idleAfterSeconds = clampIdleSeconds(input.idleAfterSeconds);
  const idleCooldownSeconds = clampIdleSeconds(input.idleCooldownSeconds);
  const now = new Date();

  if (!isSlackChannelId(channelId) || !isSlackChannelId(workChannelId)) {
    throw new Error("invalid_channel_id");
  }

  const [row] = await db
    .insert(slackLinkAssignSettings)
    .values({
      id: SETTINGS_ID,
      channelId,
      workChannelId,
      idleAfterSeconds,
      idleCooldownSeconds,
      updatedAt: now,
      updatedByUserId: input.updatedByUserId ?? null,
    })
    .onConflictDoUpdate({
      target: slackLinkAssignSettings.id,
      set: {
        channelId,
        workChannelId,
        idleAfterSeconds,
        idleCooldownSeconds,
        updatedAt: now,
        updatedByUserId: input.updatedByUserId ?? null,
      },
    })
    .returning();

  return row;
}

/** @deprecated Prefer saveSlackChannelSettings */
export async function saveSlackLinkAssignChannelId(input: {
  channelId: string;
  updatedByUserId?: string | null;
}) {
  const current = await getSlackLinkAssignSettings();
  return saveSlackChannelSettings({
    channelId: input.channelId,
    workChannelId: current?.workChannelId ?? "",
    idleAfterSeconds:
      current?.idleAfterSeconds ?? DEFAULT_IDLE_AFTER_SECONDS,
    idleCooldownSeconds:
      current?.idleCooldownSeconds ?? DEFAULT_IDLE_COOLDOWN_SECONDS,
    updatedByUserId: input.updatedByUserId,
  });
}
