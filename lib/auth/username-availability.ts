import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { and, eq, ne } from "drizzle-orm";

/** True if another user already has this normalized username. */
export async function isUsernameTakenByOtherUser(
  normalizedUsername: string,
  excludingUserId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(
      and(eq(user.username, normalizedUsername), ne(user.id, excludingUserId)),
    )
    .limit(1);
  return row != null;
}
