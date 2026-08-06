import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStaffApi } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getSlackLinkAssignSettings,
  saveSlackLinkAssignChannelId,
} from "@/lib/admin/slack-link-assign-settings";

const PatchSchema = z.object({
  channelId: z.string().trim().max(64),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSlackLinkAssignSettings();
  return NextResponse.json({
    channelId: settings?.channelId ?? "",
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
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Allow empty to clear; otherwise require Slack channel-like IDs (C… / G…)
  const channelId = parsed.data.channelId;
  if (channelId && !/^[CG][A-Z0-9]+$/i.test(channelId)) {
    return NextResponse.json(
      {
        error:
          "Channel ID should look like C012ABCDEF (from Slack channel details).",
      },
      { status: 400 },
    );
  }

  const row = await saveSlackLinkAssignChannelId({
    channelId,
    updatedByUserId: staff.user.id,
  });

  return NextResponse.json({
    ok: true,
    channelId: row.channelId,
    updatedAt: row.updatedAt?.toISOString?.() ?? null,
  });
}
