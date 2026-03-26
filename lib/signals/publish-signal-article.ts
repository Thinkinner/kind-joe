import { randomUUID, randomBytes } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles, users } from "@/db/schema";
import type { Signal } from "@/lib/aggregator/types";
import { generateSignalDeepDiveArticle } from "@/lib/aggregator/signal-deep-dive-ai";
import { pickCoverImageUrl } from "@/lib/aggregator/signal-cover-image-ai";
import {
  buildTiptapDocFromBrief,
  estimateReadingMinutesFromBrief,
} from "@/lib/signals/tiptap-doc-from-brief";

function slugifyTitle(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return s || "briefing";
}

async function findSlugBySignalId(signalId: string): Promise<string | null> {
  const rows = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(
      and(
        isNull(articles.deletedAt),
        sql`(coalesce(${articles.seo}, '{}'::jsonb)->>'sourceSignalId') = ${signalId}`,
      ),
    )
    .limit(1);
  return rows[0]?.slug ?? null;
}

async function resolveAuthorId(): Promise<string> {
  const envId = process.env.SIGNAL_ARTICLE_AUTHOR_ID?.trim();
  if (envId) {
    const hit = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, envId))
      .limit(1);
    if (hit[0]) return envId;
  }

  const first = await db.select({ id: users.id }).from(users).limit(1);
  if (!first[0]) {
    throw new Error(
      "No author user in database. Add a user or set SIGNAL_ARTICLE_AUTHOR_ID.",
    );
  }
  return first[0].id;
}

async function allocateUniqueSlug(title: string): Promise<string> {
  const base = slugifyTitle(title);
  for (let i = 0; i < 12; i++) {
    const suffix = randomBytes(3).toString("hex");
    const slug = `${base}-${suffix}`;
    const hit = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    if (!hit[0]) return slug.slice(0, 200);
  }
  return `${base}-${randomBytes(8).toString("hex")}`.slice(0, 200);
}

export async function publishArticleFromSignal(
  signal: Signal,
): Promise<{ slug: string; created: boolean }> {
  const existing = await findSlugBySignalId(signal.id);
  if (existing) {
    return { slug: existing, created: false };
  }

  const brief = await generateSignalDeepDiveArticle({
    headline: signal.headline,
    summary: signal.summary,
    category: signal.category,
    country: signal.country,
    city: signal.city,
    tags: signal.tags ?? [],
  });

  if (!brief) {
    throw new Error("Article could not be generated.");
  }

  const [coverUrl, authorId, slug] = await Promise.all([
    pickCoverImageUrl({
      headline: signal.headline,
      summary: signal.summary,
      articleTitle: brief.title,
    }),
    resolveAuthorId(),
    allocateUniqueSlug(brief.title),
  ]);

  const content = buildTiptapDocFromBrief(brief);
  const readingMinutes = estimateReadingMinutesFromBrief(brief);
  const category = signal.category.slice(0, 50);

  await db.insert(articles).values({
    id: randomUUID(),
    slug,
    title: brief.title.slice(0, 200),
    excerpt: brief.dek,
    coverImageUrl: coverUrl,
    category,
    authorId,
    publishedAt: new Date(),
    isDraft: false,
    readingMinutes,
    content: content as unknown as Record<string, unknown>,
    contentHtml: null,
    seo: { sourceSignalId: signal.id },
  });

  return { slug, created: true };
}
