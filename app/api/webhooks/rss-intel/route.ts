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

const wrappedSchema = z.object({
  event_id: z.string().min(1),
  payload: z.object({
    event: z.object({
      id: z.string().optional(),
      source: z.string().optional(),
      text: z.string().optional(),
      created_at: z.string().optional(),
      source_url: z.string().optional(),
      url: z.string().optional(),
    }).passthrough(),
    author: z.object({
      username: z.string().optional(),
      display_name: z.string().optional(),
      profile_image_url: z.string().optional(),
      is_blue_verified: z.boolean().optional(),
    }).partial().optional(),
    media: z.array(z.object({
      url: z.string().optional(),
      thumbnail_url: z.string().optional(),
    }).passthrough()).optional(),
    meta: z.object({
      ingested_at: z.string().optional(),
      source_url: z.string().optional(),
      url: z.string().optional(),
    }).partial().optional(),
  }).passthrough(),
  score: z.number().optional(),
}).passthrough();

function normalizeHandle(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.startsWith("@") ? t : `@${t}`;
}

function asHttpUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return /^https?:\/\//i.test(t) ? t : undefined;
}

function inferSource(url: string | undefined, sourceHint: string | undefined): Source {
  const hint = (sourceHint ?? "").toLowerCase();
  const href = (url ?? "").toLowerCase();
  if (href.includes("x.com/") || href.includes("twitter.com/") || hint.startsWith("@")) return "X";
  if (href.includes("t.me/") || href.includes("telegram.me/") || hint.includes("telegram")) return "Telegram";
  if (href.includes("news.google.com")) return "Google News";
  if (href.includes("apple.com/newsroom")) return "Apple Newsroom";
  if (href.includes("earthquake.usgs.gov") || hint.includes("usgs")) return "USGS Earthquakes";
  return "Discord";
}

function trustFromWrapped(score: number | undefined): { trustTier: "low" | "medium" | "high"; trustScore: number } {
  if (typeof score !== "number" || !Number.isFinite(score)) return { trustTier: "medium", trustScore: 60 };
  const pct = Math.max(0, Math.min(100, Math.round(score > 1 ? score * 10 : score * 100)));
  if (pct >= 80) return { trustTier: "high", trustScore: pct };
  if (pct >= 50) return { trustTier: "medium", trustScore: pct };
  return { trustTier: "low", trustScore: pct };
}

function normalizeWrappedPayload(body: z.infer<typeof wrappedSchema>): z.input<typeof bodySchema> {
  const event = body.payload.event;
  const author = body.payload.author;
  const media = body.payload.media ?? [];
  const meta = body.payload.meta;

  const candidateSourceUrl =
    asHttpUrl(event.source_url) ??
    asHttpUrl(event.url) ??
    asHttpUrl(meta?.source_url) ??
    asHttpUrl(meta?.url) ??
    asHttpUrl(media[0]?.url) ??
    asHttpUrl(media[0]?.thumbnail_url);

  const source = inferSource(candidateSourceUrl, event.source);
  const sourceHandle = normalizeHandle(author?.username);
  const sourceIconKey =
    source === "Google News"
      ? "google"
      : source === "Apple Newsroom"
        ? "apple"
        : source === "USGS Earthquakes"
          ? "usgs"
          : source.toLowerCase().replace(/\s+/g, "-");

  const mediaUrls = media
    .flatMap((m) => [asHttpUrl(m.url), asHttpUrl(m.thumbnail_url)])
    .filter((u): u is string => typeof u === "string");

  const trust = trustFromWrapped(body.score);

  return {
    id: event.id ?? body.event_id,
    text: event.text ?? "",
    source,
    sourceUrl: candidateSourceUrl ?? null,
    timestamp: event.created_at ?? meta?.ingested_at,
    enriched: {
      canonicalSourceUrl: candidateSourceUrl,
      sourceDisplayName: author?.display_name,
      sourceHandle,
      sourceIconKey,
      sourceAvatarUrl: author?.profile_image_url,
      sourceVerified: author?.is_blue_verified ?? false,
      trustTier: trust.trustTier,
      trustScore: trust.trustScore,
      mediaUrls,
    },
  };
}

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
  const looksWrapped =
    !!json &&
    typeof json === "object" &&
    "event_id" in json &&
    "payload" in json &&
    !!(json as { payload?: unknown }).payload &&
    typeof (json as { payload?: unknown }).payload === "object" &&
    "event" in ((json as { payload: Record<string, unknown> }).payload ?? {});
  const wrappedParsed = !parsed.success && looksWrapped ? wrappedSchema.safeParse(json) : null;
  if (!parsed.success && looksWrapped && wrappedParsed && !wrappedParsed.success) {
    return NextResponse.json(
      { error: "Invalid wrapped body", details: wrappedParsed.error.flatten() },
      { status: 400 },
    );
  }
  const normalizedWrapped =
    !parsed.success && wrappedParsed?.success
      ? normalizeWrappedPayload(wrappedParsed.data)
      : null;
  const parsedFinal = parsed.success
    ? parsed
    : normalizedWrapped
      ? bodySchema.safeParse(normalizedWrapped)
      : parsed;
  if (!parsedFinal.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsedFinal.error.flatten() },
      { status: 400 },
    );
  }

  const mode = parsed.success ? "flat" : "wrapped-normalized";
  console.info(`[rss-intel] ingest mode=${mode}`);

  const { id, text, source, sourceUrl, timestamp: parsedTs, enriched } = parsedFinal.data;
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
