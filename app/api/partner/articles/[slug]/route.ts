import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientIp } from "@/lib/auth/rate-limit";
import { isPartnerAuthorized } from "@/lib/partner/auth";
import { updatePartnerArticle } from "@/lib/partner/update-article";
import { checkSocialRateLimit } from "@/lib/social/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    excerpt: z.string().min(1).optional(),
    contentMarkdown: z.string().min(1).optional(),
    coverImageUrl: z.string().url().nullable().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        sourceUrl: z.string().optional(),
        sourceName: z.string().optional(),
        sourceType: z.string().optional(),
        sourceArticleId: z.number().int().optional(),
      })
      .optional(),
    newSlug: z.string().min(1).max(200).optional(),
    isDraft: z.boolean().optional(),
  })
  .refine(
    (body) =>
      body.title !== undefined ||
      body.excerpt !== undefined ||
      body.contentMarkdown !== undefined ||
      body.coverImageUrl !== undefined ||
      body.category !== undefined ||
      body.tags !== undefined ||
      body.seo !== undefined ||
      body.newSlug !== undefined ||
      body.isDraft !== undefined,
    { message: "Send at least one field to update." },
  );

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (!isPartnerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = checkSocialRateLimit(`partner-article-edit:${ip}`, 40, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many edits. Try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const { slug } = await ctx.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "Missing article slug." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await updatePartnerArticle(slug, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed.";
    if (message === "ARTICLE_NOT_FOUND") {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }
    if (message === "SLUG_CONFLICT") {
      return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    }
    console.error("[partner/articles PATCH]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
