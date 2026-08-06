import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveStaffApi } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  deleteStaffSlackLink,
  getStaffSlackUserId,
  listStaffSlackLinks,
  upsertStaffSlackLink,
} from "@/lib/admin/link-assignments";

const UpsertSchema = z.object({
  userId: z.string().min(1),
  slackUserId: z.union([z.string().trim().min(1).max(64), z.null()]),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_USERS);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const links = await listStaffSlackLinks();
  return NextResponse.json({
    links: links.map((row) => ({
      ...row,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    })),
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

  const parsed = UpsertSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (parsed.data.slackUserId === null || parsed.data.slackUserId === "") {
    await deleteStaffSlackLink(parsed.data.userId);
    return NextResponse.json({ ok: true, slackUserId: null });
  }

  // Slack member IDs are typically U… / W…
  const slackUserId = parsed.data.slackUserId.replace(/[^A-Za-z0-9]/g, "");
  if (!slackUserId) {
    return NextResponse.json({ error: "Invalid Slack user ID." }, { status: 400 });
  }

  try {
    const row = await upsertStaffSlackLink(parsed.data.userId, slackUserId);
    return NextResponse.json({
      ok: true,
      slackUserId: row.slackUserId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("staff_slack_links_slack_user_uq") || message.includes("duplicate")) {
      return NextResponse.json(
        { error: "That Slack user ID is already linked to another staff account." },
        { status: 409 },
      );
    }
    throw error;
  }
}

/** Convenience: current user's Slack link (any dashboard staff). */
export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action === "me") {
    const slackUserId = await getStaffSlackUserId(staff.user.id);
    return NextResponse.json({ slackUserId });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
