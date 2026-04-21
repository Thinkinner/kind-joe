import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { articlePageviews } from "@/db/schema";

const payloadSchema = z.object({
  eventType: z.enum(["impression", "click", "scroll_load"]),
  articleId: z.string().min(1).max(50),
  sourceArticleId: z.string().min(1).max(50).optional(),
  referrer: z.string().max(2000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const payload = payloadSchema.parse(await req.json());
    const sourceDetail = payload.sourceArticleId
      ? `:${payload.sourceArticleId}`
      : "";

    await db.insert(articlePageviews).values({
      articleId: payload.articleId,
      trafficSource: `related_chain_${payload.eventType}${sourceDetail}`,
      referrer: payload.referrer ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[track-related] failed", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

