import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { visitorJourneyEvents } from "@/db/schema";
import { z } from "zod";

const payloadSchema = z.object({
  sessionId: z.string().min(8).max(128),
  visitorId: z.string().min(8).max(128).optional().nullable(),
  path: z.string().min(1).max(2000),
  query: z.string().max(4000).optional().nullable(),
  referrer: z.string().max(2000).optional().nullable(),
});

function isBotUserAgent(userAgent: string) {
  return /bot|crawler|spider|crawling|preview|headless/i.test(userAgent);
}

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

export async function POST(request: Request) {
  try {
    const body = payloadSchema.parse(await request.json());
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") ?? "";

    if (isBotUserAgent(userAgent)) {
      return NextResponse.json({ ok: true, ignored: "bot" });
    }

    if (isAdminPath(body.path)) {
      return NextResponse.json({ ok: true, ignored: "admin-path" });
    }

    await db.insert(visitorJourneyEvents).values({
      sessionId: body.sessionId,
      visitorId: body.visitorId ?? null,
      path: body.path,
      query: body.query ?? null,
      referrer: body.referrer ?? null,
      userAgent: userAgent || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("track-page POST failed", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
