import { NextResponse } from "next/server";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  articleTags,
  predictionMarkets,
  tags,
} from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { ensureCmsUser } from "@/lib/cms/ensure-cms-user";
import {
  countWordsFromHtml,
  slugify,
} from "@/lib/helpers/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MIN_SUMMARY_WORDS_FOR_PUBLISH = 12;
const MIN_META_DESCRIPTION_CHARS = 70;

function emptyToNull(v: unknown): string | null {
  if (v === "" || v === undefined) return null;
  return v as string;
}

function parseDateish(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parsePredictionId(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

function normalizeSeoInput(seoInput: unknown): Record<string, unknown> {
  if (!seoInput || typeof seoInput !== "object" || Array.isArray(seoInput)) {
    return {};
  }
  return { ...(seoInput as Record<string, unknown>) };
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id } = await ctx.params;

  const [row] = await db
    .select({
      article: articles,
      tagNames: sql<string[]>`
        coalesce(
          array_agg(${tags.name})
          filter (where ${tags.id} is not null),
          '{}'
        )
      `,
    })
    .from(articles)
    .leftJoin(articleTags, eq(articleTags.articleId, articles.id))
    .leftJoin(tags, eq(tags.id, articleTags.tagId))
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .groupBy(articles.id)
    .limit(1);

  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { article, tagNames } = row;
  return NextResponse.json({
    ...article,
    tags: tagNames,
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const u = staff.user;
  await ensureCmsUser({
    id: u.id,
    name: u.name || u.email || "Staff",
    avatarUrl: u.image,
  });

  const { id } = await ctx.params;
  const body = await req.json();

  const content = body.content ?? body.blocks ?? null;
  if (!content || typeof content !== "object") {
    return new NextResponse("content json required", { status: 400 });
  }

  const slug: string | null = emptyToNull(body.slug);
  if (slug) {
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.slug, slug), ne(articles.id, id)))
      .limit(1);

    if (existing[0]) {
      return new NextResponse("Slug already in use", { status: 400 });
    }
  }

  const [existingArticle] = await db
    .select({
      id: articles.id,
      isDraft: articles.isDraft,
      excerpt: articles.excerpt,
      content: articles.content,
      contentHtml: articles.contentHtml,
      seo: articles.seo,
    })
    .from(articles)
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
    .limit(1);

  if (!existingArticle) {
    return new NextResponse("Not found", { status: 404 });
  }

  const predictionId = parsePredictionId(body.predictionId);
  if (body.predictionId !== undefined && predictionId === undefined) {
    return new NextResponse("predictionId must be a positive integer or null", {
      status: 400,
    });
  }
  if (predictionId != null) {
    const linkedPrediction = await db
      .select({ id: predictionMarkets.id })
      .from(predictionMarkets)
      .where(eq(predictionMarkets.id, predictionId))
      .limit(1);
    if (!linkedPrediction[0]) {
      return new NextResponse("prediction not found", { status: 400 });
    }
  }

  const existingSeo = normalizeSeoInput(existingArticle.seo);
  const incomingSeo =
    body.seo === undefined ? undefined : normalizeSeoInput(body.seo);
  const mergedSeo =
    incomingSeo === undefined
      ? existingSeo
      : {
          ...existingSeo,
          ...incomingSeo,
        };
  if (typeof mergedSeo.description === "string") {
    mergedSeo.description = mergedSeo.description.trim();
  }

  const nextIsDraft =
    body.isDraft === undefined ? existingArticle.isDraft : !!body.isDraft;
  const requiresEditorialChecks =
    !nextIsDraft ||
    typeof body.publishAt === "string" ||
    typeof body.publishedAt === "string";
  const nextExcerpt =
    emptyToNull(body.excerpt) ?? (existingArticle.excerpt ?? null);
  const nextContentHtml =
    emptyToNull(body.contentHtml) ?? (existingArticle.contentHtml ?? null);
  const nextContent = content ?? existingArticle.content;
  const seoDescription = asTrimmedString(mergedSeo.description);
  const summaryWordCount = countWordsFromHtml(nextExcerpt);

  if (requiresEditorialChecks) {
    if (!seoDescription || seoDescription.length < MIN_META_DESCRIPTION_CHARS) {
      return NextResponse.json(
        {
          error: `Meta description is required and should be at least ${MIN_META_DESCRIPTION_CHARS} characters for publish/schedule.`,
        },
        { status: 400 },
      );
    }

    if (!nextExcerpt?.trim() || summaryWordCount < MIN_SUMMARY_WORDS_FOR_PUBLISH) {
      return NextResponse.json(
        {
          error: `Summary excerpt is required and should be at least ${MIN_SUMMARY_WORDS_FOR_PUBLISH} words for publish/schedule.`,
        },
        { status: 400 },
      );
    }

  }

  const update: Record<string, unknown> = {
    title: body.title ?? "",
    slug: slug ?? undefined,
    excerpt: emptyToNull(body.excerpt),
    category: body.category ?? "General",
    coverImageUrl: emptyToNull(body.coverImageUrl),
    isDraft: !!body.isDraft,
    updatedAt: new Date(),
    content,
    contentHtml: emptyToNull(body.contentHtml),
    seo: body.seo === undefined ? undefined : mergedSeo,
    readingMinutes:
      typeof body.readingMinutes === "number" ? body.readingMinutes : null,
    predictionId,
  };

  if (body.authorId != null) {
    update.authorId = emptyToNull(body.authorId);
  }

  if (body.publishAt === null) {
    update.publishAt = null;
  } else if (typeof body.publishAt === "string") {
    update.publishAt = parseDateish(body.publishAt);
  }

  if (body.publishedAt === null) {
    update.publishedAt = null;
    update.publishedBy = null;
  } else if (typeof body.publishedAt === "string") {
    const pub = parseDateish(body.publishedAt);
    update.publishedAt = pub;
    update.publishedBy = pub ? u.id : null;
  }

  Object.keys(update).forEach((k) => {
    if (update[k] === undefined) delete update[k];
  });

  const [updated] = await db
    .update(articles)
    .set(update as Record<string, unknown>)
    .where(eq(articles.id, id))
    .returning();

  if (!updated) return new NextResponse("Not found", { status: 404 });

  const rawTags = Array.isArray(body.tags) ? body.tags : [];
  const tagNames: string[] = rawTags
    .map((t: unknown) => String(t).trim())
    .filter(Boolean);

  if (tagNames.length > 0) {
    const slugs = tagNames.map((name) => slugify(name));

    const existingTags = await db
      .select()
      .from(tags)
      .where(inArray(tags.slug, slugs));

    const existingBySlug = new Map(existingTags.map((t) => [t.slug, t]));
    const tagIds: number[] = [];

    for (const name of tagNames) {
      const tagSlug = slugify(name);
      const found = existingBySlug.get(tagSlug);

      if (found) {
        tagIds.push(found.id);
        continue;
      }

      const [inserted] = await db
        .insert(tags)
        .values({ name, slug: tagSlug })
        .returning();

      existingBySlug.set(tagSlug, inserted);
      tagIds.push(inserted.id);
    }

    await db.delete(articleTags).where(eq(articleTags.articleId, id));

    await db.insert(articleTags).values(
      tagIds.map((tagId) => ({
        articleId: id,
        tagId,
      })),
    );
  } else {
    await db.delete(articleTags).where(eq(articleTags.articleId, id));
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { id } = await ctx.params;
  await db
    .update(articles)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(articles.id, id));

  return NextResponse.json({ ok: true });
}
