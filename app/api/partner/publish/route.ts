import { NextResponse } from "next/server";
import { z } from "zod";

import { publishPartnerBundle } from "@/lib/partner/publish-bundle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const seoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    sourceUrl: z.string().optional(),
    sourceName: z.string().optional(),
    sourceType: z.string().optional(),
    sourceArticleId: z.number().int().optional(),
  })
  .optional();

const bodySchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1),
  contentMarkdown: z.string().min(1),
  coverImageUrl: z.string().url().optional().nullable(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  seo: seoSchema,
  postCard: z.object({
    imageUrl: z.string().url(),
    caption: z.string().optional(),
  }),
  isVentura: z.boolean().optional(),
});

function isAuthorized(request: Request): boolean {
  const secret = (process.env.HOPE_PUBLISH_API_KEY || "").trim();
  if (!secret) return process.env.NODE_ENV !== "production";

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader === `Bearer ${secret}`) return true;

  const apiKeyHeader = (request.headers.get("x-api-key") || "").trim();
  return apiKeyHeader === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await publishPartnerBundle(parsed.data);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed.";
    if (message === "SLUG_CONFLICT") {
      return NextResponse.json({ error: "Slug already exists." }, { status: 409 });
    }
    console.error("[partner/publish]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
