import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRelatedChainBySlug } from "@/lib/recommendations/article-related";

const querySchema = z.object({
  cursor: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(8).default(3),
  seen: z
    .string()
    .optional()
    .transform((raw) =>
      (raw ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const parsed = querySchema.safeParse({
      cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
      seen: req.nextUrl.searchParams.get("seen") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
    }

    const result = await getRelatedChainBySlug({
      slug,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
      seenArticleIds: parsed.data.seen,
    });

    if (!result) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[related-chain] failed", error);
    return NextResponse.json({ error: "Failed to fetch related chain" }, { status: 500 });
  }
}

