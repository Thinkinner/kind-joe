import { NextResponse } from "next/server";
import { z } from "zod";
import { processIntelRaw } from "@/lib/aggregator/factory";

export const maxDuration = 120;

const bodySchema = z.object({
  id: z.string().min(1).max(2048),
  text: z.string().min(1).max(200_000),
  source: z.string().min(1).max(120),
  sourceUrl: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v == null || typeof v !== "string") return null;
      const t = v.trim();
      if (!t.startsWith("http")) return null;
      return t;
    }),
  timestamp: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }),
});

/**
 * Ingest from `kindjoe-signal-worker` (RSS poller). Same pipeline as Discord webhook.
 * Env: RSS_INTEL_WEBHOOK_SECRET — send `Authorization: Bearer <secret>`.
 */
export async function POST(req: Request) {
  const secret = process.env.RSS_INTEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "RSS_INTEL_WEBHOOK_SECRET is not configured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, text, source, sourceUrl, timestamp } = parsed.data;

  await processIntelRaw({
    id,
    text,
    source,
    sourceUrl,
    timestamp,
  });

  return NextResponse.json({ ok: true });
}
