import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { articlePageviews } from "@/db/schema";

const payloadSchema = z.object({
  articleId: z.string().min(1).max(50),
  utmSource: z.string().max(100).optional().nullable(),
  utmMedium: z.string().max(100).optional().nullable(),
  utmCampaign: z.string().max(100).optional().nullable(),
  referrer: z.string().max(2000).optional().nullable(),
});

function isBotUserAgent(userAgent: string) {
  return /bot|crawler|spider|crawling|preview|headless/i.test(userAgent);
}

function deriveTrafficSource(input: { utmSource?: string | null; referrer?: string | null }) {
  if (input.utmSource?.trim()) return input.utmSource.trim().toLowerCase();
  if (!input.referrer) return "direct";

  try {
    return new URL(input.referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "direct";
  }
}

export async function POST(request: Request) {
  try {
    const body = payloadSchema.parse(await request.json());
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") ?? "";

    if (isBotUserAgent(userAgent)) {
      return NextResponse.json({ ok: true, ignored: "bot" });
    }

    await db.insert(articlePageviews).values({
      articleId: body.articleId,
      utmSource: body.utmSource ?? null,
      utmMedium: body.utmMedium ?? null,
      utmCampaign: body.utmCampaign ?? null,
      referrer: body.referrer ?? null,
      trafficSource: deriveTrafficSource(body),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("track-view POST failed", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
