/**
 * Promote a Better Auth user to staff (by email).
 * Usage: npx tsx scripts/promote-auth-staff.ts you@example.com [superadmin|owner|admin|manager|editor|writer]
 *
 * Requires DATABASE_URL (e.g. from .env.local).
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { user as authUser } from "../db/auth-schema";
import {
  normalizeStaffRoles,
  primaryStaffRole,
} from "../lib/auth/staff-roles";

const email = process.argv[2]?.trim().toLowerCase();
const role = (process.argv[3]?.trim() || "owner").toLowerCase();
const ALLOWED = ["superadmin", "owner", "admin", "manager", "editor", "writer"] as const;

async function main() {
  if (!email) {
    console.error(
      "Usage: npx tsx scripts/promote-auth-staff.ts <email> [superadmin|owner|admin|manager|editor|writer]",
    );
    process.exit(1);
  }
  if (!ALLOWED.includes(role as (typeof ALLOWED)[number])) {
    console.error("Role must be one of: superadmin, owner, admin, manager, editor, writer");
    process.exit(1);
  }
  const roles = normalizeStaffRoles([role]);
  const updated = await db
    .update(authUser)
    .set({
      accountType: "staff",
      staffRoles: roles,
      staffRole: primaryStaffRole(roles),
    })
    .where(eq(authUser.email, email))
    .returning({ id: authUser.id, email: authUser.email });

  if (updated.length === 0) {
    console.error(`No auth user found with email: ${email}`);
    process.exit(1);
  }
  console.log("Updated:", updated[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
