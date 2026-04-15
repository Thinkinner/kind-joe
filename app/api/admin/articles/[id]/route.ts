import { NextResponse } from "next/server";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  articleTags,
  tags,
} from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { ensureCmsUser } from "@/lib/cms/ensure-cms-user";
import { slugify } from "@/lib/helpers/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALIAS_REQUIRED_MESSAGE = "Set your alias in Settings before publishing.";

function emptyToNull(v: unknown): string | null {
  if (v === "" || v === undefined) return null;
  return v as string;
}

function parseDateish(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const aliasFullName =
    typeof u.aliasFullName === "string" ? u.aliasFullName.trim() : "";
  await ensureCmsUser({
    id: u.id,
    name: u.name || u.email || "Staff",
    aliasFullName: aliasFullName || null,
    avatarUrl: u.image,
  });

  const { id } = await ctx.params;
  const body = await req.json();
  const hasPublishAt =
    body.publishAt != null &&
    (!(typeof body.publishAt === "string") || body.publishAt.trim().length > 0);
  const hasPublishedAt =
    body.publishedAt != null &&
    (!(typeof body.publishedAt === "string") || body.publishedAt.trim().length > 0);
  const isPublishingNow = body.isDraft === false || hasPublishAt || hasPublishedAt;
  if (isPublishingNow && !aliasFullName) {
    return NextResponse.json({ error: ALIAS_REQUIRED_MESSAGE }, { status: 400 });
  }

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
    seo: body.seo ?? {},
    readingMinutes:
      typeof body.readingMinutes === "number" ? body.readingMinutes : null,
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
