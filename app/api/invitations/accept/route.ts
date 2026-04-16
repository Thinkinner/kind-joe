import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { staffInvitation, user as authUser } from "@/db/auth-schema";
import { hashInviteToken } from "@/lib/auth/staff-invite";
import {
  hasSuperAdminRole,
  normalizeStaffRoles,
  parseStaffRolesFromDb,
  primaryStaffRole,
} from "@/lib/auth/staff-roles";
import { getServerSession } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  token: z.string().min(16),
});

function parseToken(value: string | null | undefined): string | null {
  const token = value?.trim();
  if (!token || token.length < 16) return null;
  return token;
}

export async function GET(req: NextRequest) {
  const token = parseToken(req.nextUrl.searchParams.get("token"));
  if (!token) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const tokenHash = hashInviteToken(token);
  const [inv] = await db
    .select({
      id: staffInvitation.id,
      email: staffInvitation.email,
      staffRole: staffInvitation.staffRole,
      adminPageAccess: staffInvitation.adminPageAccess,
      expiresAt: staffInvitation.expiresAt,
      acceptedAt: staffInvitation.acceptedAt,
    })
    .from(staffInvitation)
    .where(eq(staffInvitation.tokenHash, tokenHash))
    .limit(1);

  if (!inv) {
    return NextResponse.json({ error: "Invalid or expired invitation." }, { status: 404 });
  }

  if (inv.acceptedAt) {
    return NextResponse.json({ error: "This invitation was already used." }, { status: 410 });
  }

  if (inv.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  const [existingUser] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, inv.email))
    .limit(1);

  const session = await getServerSession();
  const sessionEmail = (session?.user as { email?: string } | undefined)?.email
    ?.trim()
    .toLowerCase();

  return NextResponse.json({
    ok: true,
    email: inv.email,
    hasAccount: Boolean(existingUser),
    signedIn: Boolean(session?.user),
    sessionEmailMatchesInvite:
      Boolean(sessionEmail) && sessionEmail === inv.email.toLowerCase(),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const tokenHash = hashInviteToken(parsed.data.token);
  const sessionEmail = (session.user as { email?: string }).email
    ?.trim()
    .toLowerCase();
  if (!sessionEmail) {
    return NextResponse.json({ error: "No email on session." }, { status: 400 });
  }

  const [inv] = await db
    .select()
    .from(staffInvitation)
    .where(eq(staffInvitation.tokenHash, tokenHash))
    .limit(1);

  if (!inv) {
    return NextResponse.json({ error: "Invalid or expired invitation." }, { status: 404 });
  }

  if (inv.acceptedAt) {
    return NextResponse.json({ error: "This invitation was already used." }, { status: 410 });
  }

  if (inv.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  if (inv.email.toLowerCase() !== sessionEmail) {
    return NextResponse.json(
      {
        error: `Sign in as ${inv.email} to accept this invitation.`,
      },
      { status: 403 },
    );
  }

  const userId = session.user.id;

  const [existingUser] = await db
    .select({
      staffRoles: authUser.staffRoles,
      staffRole: authUser.staffRole,
    })
    .from(authUser)
    .where(eq(authUser.id, userId))
    .limit(1);

  const merged = normalizeStaffRoles([
    ...parseStaffRolesFromDb(existingUser ?? {}),
    inv.staffRole,
  ]);
  const primary = primaryStaffRole(merged);
  const normalizedInvitePageAccess = Array.isArray(inv.adminPageAccess)
    ? Array.from(
        new Set(
          inv.adminPageAccess.filter((perm): perm is string => typeof perm === "string"),
        ),
      )
    : null;

  await db.transaction(async (tx) => {
    const updatePayload: {
      accountType: "staff";
      staffRoles: string[];
      staffRole: string;
      adminPageAccess?: string[] | null;
    } = {
      accountType: "staff",
      staffRoles: merged,
      staffRole: primary,
    };
    // Preserve superadmin accounts from invite-scoped page-access overrides.
    if (!hasSuperAdminRole(merged)) {
      updatePayload.adminPageAccess = normalizedInvitePageAccess;
    }
    await tx
      .update(authUser)
      .set(updatePayload)
      .where(eq(authUser.id, userId));

    await tx
      .update(staffInvitation)
      .set({ acceptedAt: new Date() })
      .where(eq(staffInvitation.id, inv.id));
  });

  return NextResponse.json({
    ok: true,
    staffRoles: merged,
    staffRole: primary,
  });
}
