import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Keeps `users` (CMS authors) aligned with Better Auth staff accounts. */
export async function ensureCmsUser(opts: {
  id: string;
  name: string;
  aliasFullName?: string | null;
  avatarUrl?: string | null;
}) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, opts.id))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({
        name: opts.name,
        aliasFullName: opts.aliasFullName ?? null,
        avatarUrl: opts.avatarUrl ?? null,
      })
      .where(eq(users.id, opts.id));
    return;
  }

  await db.insert(users).values({
    id: opts.id,
    name: opts.name,
    aliasFullName: opts.aliasFullName ?? null,
    avatarUrl: opts.avatarUrl ?? null,
    role: "Writer",
  });
}
