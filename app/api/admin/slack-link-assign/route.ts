import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStaffApi } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  DEFAULT_IDLE_AFTER_SECONDS,
  DEFAULT_IDLE_COOLDOWN_SECONDS,
  MAX_IDLE_SECONDS,
  MIN_IDLE_SECONDS,
  getSlackLinkAssignSettings,
  saveSlackChannelSettings,
} from "@/lib/admin/slack-link-assign-settings";

const PatchSchema = z.object({
  channelId: z.string().trim().max(64),
  workChannelId: z.string().trim().max(64),
  idleAfterSeconds: z.number().int().min(MIN_IDLE_SECONDS).max(MAX_IDLE_SECONDS),
  idleCooldownSeconds: z
    .number()
    .int()
    .min(MIN_IDLE_SECONDS)
    .max(MAX_IDLE_SECONDS),
});

function validateChannelId(channelId: string) {
  // Allow empty to clear; otherwise require Slack channel-like IDs (C… / G…)
  if (channelId && !/^[CG][A-Z0-9]+$/i.test(channelId)) {
    return false;
  }
  return true;
}

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSlackLinkAssignSettings();
  return NextResponse.json({
    channelId: settings?.channelId ?? "",
    workChannelId: settings?.workChannelId ?? "",
    idleAfterSeconds:
      settings?.idleAfterSeconds ?? DEFAULT_IDLE_AFTER_SECONDS,
    idleCooldownSeconds:
      settings?.idleCooldownSeconds ?? DEFAULT_IDLE_COOLDOWN_SECONDS,
    updatedAt: settings?.updatedAt?.toISOString?.() ?? null,
  });
}

export async function PATCH(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Invalid body. Idle times must be ${MIN_IDLE_SECONDS}–${MAX_IDLE_SECONDS} seconds.`,
      },
      { status: 400 },
    );
  }

  const { channelId, workChannelId, idleAfterSeconds, idleCooldownSeconds } =
    parsed.data;
  if (!validateChannelId(channelId) || !validateChannelId(workChannelId)) {
    return NextResponse.json(
      {
        error:
          "Channel ID should look like C012ABCDEF (from Slack channel details).",
      },
      { status: 400 },
    );
  }

  const row = await saveSlackChannelSettings({
    channelId,
    workChannelId,
    idleAfterSeconds,
    idleCooldownSeconds,
    updatedByUserId: staff.user.id,
  });

  return NextResponse.json({
    ok: true,
    channelId: row.channelId,
    workChannelId: row.workChannelId,
    idleAfterSeconds: row.idleAfterSeconds,
    idleCooldownSeconds: row.idleCooldownSeconds,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
  });
}
