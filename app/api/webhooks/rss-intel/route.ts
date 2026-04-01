import { NextResponse } from "next/server";
import { z } from "zod";
import { processIntelRaw } from "@/lib/aggregator/factory";
import type { Source } from "@/lib/aggregator/types";

export const maxDuration = 120;

/** Must match {@link Source}; worker payloads must use one of these strings. */
const RSS_INTEL_SOURCES = [
  "X",
  "Telegram",
  "Discord",
  "RSS",
  "Google News",
  "Apple Newsroom",
  "USGS Earthquakes",
] as const satisfies readonly Source[];

const sourceSchema = z.enum(RSS_INTEL_SOURCES);

const bodySchema = z.object({
  id: z.string().min(1).max(2048),
  text: z.string().min(1).max(200_000),
  source: sourceSchema,
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
  enriched: z
    .object({
      canonicalSourceUrl: z.string().optional(),
      sourceDisplayName: z.string().optional(),
      sourceHandle: z.string().optional(),
      sourceIconKey: z.string().optional(),
      sourceAvatarUrl: z.string().optional(),
      sourceVerified: z.boolean().optional(),
      trustTier: z.enum(["low", "medium", "high"]).optional(),
      trustScore: z.number().optional(),
      mediaUrls: z.array(z.string()).optional(),
    })
    .partial()
    .optional(),
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

  const { id, text, source, sourceUrl, timestamp: parsedTs, enriched } = parsed.data;
  const timestamp = parsedTs ?? new Date();

  await processIntelRaw({
    id,
    text,
    source,
    sourceUrl,
    timestamp,
    enriched,
  });

  return NextResponse.json({ ok: true });
}
