import { eq } from "drizzle-orm";
import { db } from "@/db";
import { slackLinkAssignSettings } from "@/db/schema";

const SETTINGS_ID = 1;

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

export async function getSlackLinkAssignSettings() {
  const [row] = await db
    .select()
    .from(slackLinkAssignSettings)
    .where(eq(slackLinkAssignSettings.id, SETTINGS_ID))
    .limit(1);

  if (row) return row;

  const [created] = await db
    .insert(slackLinkAssignSettings)
    .values({ id: SETTINGS_ID, channelId: "" })
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

export async function saveSlackLinkAssignChannelId(input: {
  channelId: string;
  updatedByUserId?: string | null;
}) {
  const channelId = input.channelId.trim();
  const now = new Date();

  const [row] = await db
    .insert(slackLinkAssignSettings)
    .values({
      id: SETTINGS_ID,
      channelId,
      updatedAt: now,
      updatedByUserId: input.updatedByUserId ?? null,
    })
    .onConflictDoUpdate({
      target: slackLinkAssignSettings.id,
      set: {
        channelId,
        updatedAt: now,
        updatedByUserId: input.updatedByUserId ?? null,
      },
    })
    .returning();

  return row;
}
