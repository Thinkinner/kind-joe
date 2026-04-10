import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  articleCategories,
  articleTags,
  categories,
  tags as tagsTable,
} from "@/db/schema";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";
import { ensureCmsUser } from "@/lib/cms/ensure-cms-user";
import { calcReadingMinutesFromHtml, slugify } from "@/lib/helpers/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  coverImageUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
  category: z.string().optional().default("General"),
  tags: z.array(z.string()).optional().default([]),
  readingMinutes: z.number().int().positive().optional(),
  isDraft: z.boolean().default(true),
  seo: z.any().optional(),
  blocks: z
    .object({
      type: z.literal("doc"),
      content: z.array(z.unknown()).optional(),
    })
    .default({ type: "doc", content: [{ type: "paragraph" }] }),
  contentHtml: z.string().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  publishAt: z.string().datetime().nullable().optional(),
});

function newArticleId(): string {
  return randomBytes(10).toString("hex").slice(0, 20);
}

function parseListParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitRaw = parseInt(searchParams.get("limit") || "25", 10);
  const offsetRaw = parseInt(searchParams.get("offset") || "0", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100);
  const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);
  const q = searchParams.get("q")?.trim() || "";
  return { limit, offset, q };
}

export async function GET(request: NextRequest) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_DASHBOARD);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const { limit, offset, q } = parseListParams(request);

  const searchCond =
    q.length > 0
      ? or(ilike(articles.title, `%${q}%`), ilike(articles.excerpt, `%${q}%`))
      : undefined;

  const whereClause = searchCond
    ? and(isNull(articles.deletedAt), searchCond)
    : isNull(articles.deletedAt);

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(articles)
    .where(whereClause);

  const total = Number(countRow?.n ?? 0);

  const list = await db
    .select({
      id: articles.id,
      title: articles.title,
      excerpt: articles.excerpt,
      category: articles.category,
      coverImageUrl: articles.coverImageUrl,
      publishedAt: articles.publishedAt,
      publishAt: articles.publishAt,
      updatedAt: articles.updatedAt,
      isDraft: articles.isDraft,
    })
    .from(articles)
    .where(whereClause)
    .orderBy(desc(articles.updatedAt))
    .limit(limit)
    .offset(offset);

  const out = list.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    publishAt: r.publishAt ? r.publishAt.toISOString() : null,
    updatedAt: r.updatedAt.toISOString(),
  }));

  const hasMore = offset + out.length < total;

  return NextResponse.json({
    articles: out,
    total,
    limit,
    offset,
    hasMore,
  });
}

export async function POST(req: NextRequest) {
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

  const parsed = SubmitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const wantsPublishedNow = !!input.publishedAt;
  const wantsScheduled = !!input.publishAt;
  const normalizedSlug = slugify(input.slug);
  const id = newArticleId();

  try {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.slug, normalizedSlug));
      if (existing.length > 0) {
        throw new Error("SLUG_CONFLICT");
      }

      const readingMinutes =
        input.readingMinutes ?? calcReadingMinutesFromHtml(input.contentHtml);
      const finalIsDraft = wantsPublishedNow || wantsScheduled ? false : input.isDraft;

      const publishedAtDate =
        wantsPublishedNow && input.publishedAt
          ? new Date(input.publishedAt)
          : null;
      const publishAtDate =
        wantsScheduled && input.publishAt ? new Date(input.publishAt) : null;

      await tx.insert(articles).values({
        id,
        slug: normalizedSlug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        coverImageUrl: input.coverImageUrl?.trim() || null,
        category: input.category ?? "General",
        authorId: u.id,
        publishedAt: publishedAtDate,
        publishAt: publishAtDate,
        publishedBy: publishedAtDate ? u.id : null,
        readingMinutes,
        isDraft: finalIsDraft,
        seo: input.seo ?? null,
        content: input.blocks as object,
        contentHtml: input.contentHtml ?? null,
      });

      if (input.category?.trim()) {
        const catSlug = slugify(input.category);
        let categoryRow = await tx
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.slug, catSlug));

        if (categoryRow.length === 0) {
          const created = await tx
            .insert(categories)
            .values({ name: input.category, slug: catSlug })
            .returning({ id: categories.id });
          categoryRow = created;
        }

        await tx.insert(articleCategories).values({
          articleId: id,
          categoryId: categoryRow[0].id,
        });
      }

      for (const raw of input.tags ?? []) {
        const name = raw.trim();
        if (!name) continue;
        const tgSlug = slugify(name);

        let t = await tx
          .select({ id: tagsTable.id })
          .from(tagsTable)
          .where(eq(tagsTable.slug, tgSlug));

        if (t.length === 0) {
          const created = await tx
            .insert(tagsTable)
            .values({ name, slug: tgSlug })
            .returning({ id: tagsTable.id });
          t = created;
        }

        await tx.insert(articleTags).values({
          articleId: id,
          tagId: t[0].id,
        });
      }
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "SLUG_CONFLICT") {
      return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
