import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { user as authUser } from "@/db/auth-schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { ensureCmsUser } from "@/lib/cms/ensure-cms-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  aliasFullName: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(120).optional(),
}).refine((data) => Boolean(data.aliasFullName || data.name), {
  message: "Provide at least one field to update.",
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const [row] = await db
    .select({ aliasFullName: authUser.aliasFullName, name: authUser.name })
    .from(authUser)
    .where(eq(authUser.id, staff.user.id))
    .limit(1);

  return NextResponse.json({
    aliasFullName: row?.aliasFullName ?? null,
    name: row?.name ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const nextAlias = parsed.data.aliasFullName?.trim();
  const nextName = parsed.data.name?.trim();

  const [existing] = await db
    .select({ aliasFullName: authUser.aliasFullName, name: authUser.name })
    .from(authUser)
    .where(eq(authUser.id, staff.user.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (nextAlias && (existing.aliasFullName ?? "").trim().length > 0) {
    return NextResponse.json(
      { error: "Alias is locked after first save and cannot be changed." },
      { status: 409 },
    );
  }

  const updatePayload: Partial<{
    aliasFullName: string;
    name: string;
  }> = {};

  if (nextAlias) updatePayload.aliasFullName = nextAlias;
  if (nextName) updatePayload.name = nextName;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const [updated] = await db
    .update(authUser)
    .set(updatePayload)
    .where(eq(authUser.id, staff.user.id))
    .returning({ id: authUser.id, aliasFullName: authUser.aliasFullName, name: authUser.name });

  if (!updated) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await ensureCmsUser({
    id: staff.user.id,
    name: updated.name || staff.user.name || staff.user.email || "Staff",
    avatarUrl: staff.user.image,
  });

  return NextResponse.json({
    aliasFullName: updated.aliasFullName ?? null,
    name: updated.name ?? null,
  });
}
