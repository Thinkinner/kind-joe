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
  aliasFullName: z.string().trim().min(1).max(120),
});

export async function GET() {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_SECURITY);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const [row] = await db
    .select({ aliasFullName: authUser.aliasFullName })
    .from(authUser)
    .where(eq(authUser.id, staff.user.id))
    .limit(1);

  return NextResponse.json({
    aliasFullName: row?.aliasFullName ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_SECURITY);
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

  const aliasFullName = parsed.data.aliasFullName.trim();

  const [updated] = await db
    .update(authUser)
    .set({ aliasFullName })
    .where(eq(authUser.id, staff.user.id))
    .returning({ id: authUser.id, aliasFullName: authUser.aliasFullName });

  if (!updated) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await ensureCmsUser({
    id: staff.user.id,
    name: staff.user.name || staff.user.email || "Staff",
    aliasFullName,
    avatarUrl: staff.user.image,
  });

  return NextResponse.json({
    aliasFullName: updated.aliasFullName ?? null,
  });
}
