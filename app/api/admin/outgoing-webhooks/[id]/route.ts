import { NextResponse } from "next/server";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import {
  deleteOutgoingWebhookAdmin,
  updateOutgoingWebhookAdmin,
} from "@/lib/webhooks/outgoing-webhooks";

const updateWebhookSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().url().max(2048).optional(),
  authorizationToken: z.string().max(4096).nullable().optional(),
  enabled: z.boolean().optional(),
});

function parseId(id: string) {
  const n = Number.parseInt(id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const p = await params;
  const id = parseId(p.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = updateWebhookSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = await updateOutgoingWebhookAdmin(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ webhook: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    if (staff.reason === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const p = await params;
  const id = parseId(p.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const ok = await deleteOutgoingWebhookAdmin(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
