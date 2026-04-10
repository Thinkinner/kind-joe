import { eq } from "drizzle-orm";
import { db } from "@/db";
import { draftsTable } from "@/db/schema";
import type { NewsletterDraft } from "@/lib/(newsletter-automations)/types";

/**
 * Loads a newsletter draft by id for RSC routes (e.g. /admin/newsletter/history/[id]).
 * Auth is enforced by the admin dashboard layout; do not import this into client code.
 */
export async function loadNewsletterDraftById(
  id: string,
): Promise<NewsletterDraft | null> {
  if (!id?.trim()) return null;

  try {
    const [row] = await db
      .select()
      .from(draftsTable)
      .where(eq(draftsTable.id, id))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      status: row.status as NewsletterDraft["status"],
      createdAt: row.createdAt.getTime(),
      data: row.data,
      articles: row.articles || [],
    };
  } catch (e) {
    console.error("loadNewsletterDraftById:", e);
    return null;
  }
}
