/**
 * Promote a Better Auth user to staff (by email).
 * Usage: npx tsx scripts/promote-auth-staff.ts you@example.com [owner|editor|writer]
 *
 * Requires DATABASE_URL (e.g. from .env.local).
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db/index";
import { user as authUser } from "../db/auth-schema";

const email = process.argv[2]?.trim().toLowerCase();
const role = (process.argv[3]?.trim() || "owner").toLowerCase();

async function main() {
  if (!email) {
    console.error("Usage: npx tsx scripts/promote-auth-staff.ts <email> [owner|editor|writer]");
    process.exit(1);
  }
  if (!["owner", "editor", "writer"].includes(role)) {
    console.error("Role must be owner, editor, or writer");
    process.exit(1);
  }
  const updated = await db
    .update(authUser)
    .set({ accountType: "staff", staffRole: role })
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
