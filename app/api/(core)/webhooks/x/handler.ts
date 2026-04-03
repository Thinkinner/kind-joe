import { NextResponse } from "next/server";
import { z } from "zod";
import { processIntelRaw } from "@/lib/aggregator/factory";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { canonicalizeSignalUrl } from "@/lib/signals/signal-enrichment";
import { normalizeTextForUrlSearch } from "@/lib/signals/signal-source-url";
import {
  createIncomingEventRecord,
  fanoutSignalCreatedEvent,
} from "@/lib/domains/webhooks";

export const maxDuration = 120;

const trustTierSchema = z.enum(["low", "medium", "high"]);
const HTTP_URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
const ENRICHMENT_CATEGORIES = [
  "World",
  "Military",
  "Finance",
  "Environment",
  "Energy",
  "Tech",
  "Health",
  "Society",
] as const;

const directXPayloadSchema = z.object({
  id: z.string().min(1).max(2048),
  text: z.string().max(200_000),
  source: z.string().optional(),
  url: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  sourceDisplayName: z.string().optional().nullable(),
  sourceHandle: z.string().optional().nullable(),
  sourceAvatarUrl: z.string().optional().nullable(),
  sourceVerified: z.boolean().optional().nullable(),
  lat: z.union([z.number(), z.string()]).optional().nullable(),
  lng: z.union([z.number(), z.string()]).optional().nullable(),
  impactScore: z.union([z.number(), z.string()]).optional().nullable(),
  category: z.string().optional().nullable(),
  enrichmentProvider: z.string().optional().nullable(),
  enrichmentModel: z.string().optional().nullable(),
  enrichmentConfidence: z.union([z.number(), z.string()]).optional().nullable(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  meta: z
    .object({
      messageId: z.string().optional(),
      guildId: z.string().optional(),
      channelId: z.string().optional(),
      channelName: z.string().optional(),
      receivedAt: z.string().optional(),
    })
    .partial()
    .optional(),
  author: z
    .object({
      name: z.string().optional().nullable(),
      displayName: z.string().optional().nullable(),
      username: z.string().optional().nullable(),
      handle: z.string().optional().nullable(),
      profileImageUrl: z.string().optional().nullable(),
      avatarUrl: z.string().optional().nullable(),
      verified: z.boolean().optional().nullable(),
      isVerified: z.boolean().optional().nullable(),
    })
    .partial()
    .optional(),
  enriched: z
    .object({
      canonicalSourceUrl: z.string().optional().nullable(),
      sourceDisplayName: z.string().optional().nullable(),
      sourceHandle: z.string().optional().nullable(),
      sourceIconKey: z.string().optional().nullable(),
      sourceAvatarUrl: z.string().optional().nullable(),
      sourceVerified: z.boolean().optional().nullable(),
      trustTier: trustTierSchema.optional().nullable(),
      trustScore: z.number().optional().nullable(),
      mediaUrls: z.array(z.string()).optional().nullable(),
      lat: z.union([z.number(), z.string()]).optional().nullable(),
      lng: z.union([z.number(), z.string()]).optional().nullable(),
      impactScore: z.union([z.number(), z.string()]).optional().nullable(),
      category: z.string().optional().nullable(),
      enrichmentConfidence: z.union([z.number(), z.string()]).optional().nullable(),
      enrichmentProvider: z.string().optional().nullable(),
      enrichmentModel: z.string().optional().nullable(),
    })
    .partial()
    .optional(),
});

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const handle = value.trim().replace(/^@+/, "");
  if (!handle) return null;
  return `@${handle}`;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asImpactScore(value: unknown): number | null {
  const n = asFiniteNumber(value);
  if (n == null) return null;
  if (n < 1 || n > 100) return null;
  return Math.round(n);
}

function trimStr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function asCategory(value: unknown): (typeof ENRICHMENT_CATEGORIES)[number] | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return ENRICHMENT_CATEGORIES.includes(v as (typeof ENRICHMENT_CATEGORIES)[number])
    ? (v as (typeof ENRICHMENT_CATEGORIES)[number])
    : null;
}

function normalizeInboundText(raw: string): string {
  const normalizedRaw = normalizeTextForUrlSearch(raw);
  const withExpandedMarkdown = normalizedRaw.replace(
    MARKDOWN_LINK_RE,
    (_full, label: string, href: string) => {
      const cleanedLabel = label.trim();
      return cleanedLabel ? `${cleanedLabel} ${href}` : href;
    },
  );

  const seen = new Set<string>();
  const dedupedUrls = withExpandedMarkdown.replace(HTTP_URL_RE, (url) => {
    const cleaned = asHttpUrl(url.replace(/[),.;!?]+$/g, ""));
    if (!cleaned) return url;
    const canonical = canonicalizeSignalUrl(cleaned) ?? cleaned;
    const key = canonical.toLowerCase();
    if (seen.has(key)) return "";
    seen.add(key);
    return canonical;
  });

  return dedupedUrls.replace(/\s{2,}/g, " ").trim();
}

async function ingestDirectPayload(raw: unknown) {
  const parsed = directXPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      body: { error: "Invalid X payload", details: parsed.error.flatten() },
    };
  }

  const data = parsed.data;
  const text = normalizeInboundText(data.text.trim());
  if (!text) {
    return {
      ok: false as const,
      status: 400,
      body: { error: "text is required" },
    };
  }
  const sourceUrl =
    asHttpUrl(data.sourceUrl) ??
    asHttpUrl(data.twitterUrl) ??
    asHttpUrl(data.url) ??
    asHttpUrl(data.enriched?.canonicalSourceUrl) ??
    null;

  const timestamp = asDate(data.timestamp) ?? asDate(data.createdAt) ?? undefined;

  const sourceDisplayName =
    data.enriched?.sourceDisplayName?.trim() ||
    data.author?.displayName?.trim() ||
    data.author?.name?.trim() ||
    data.sourceDisplayName?.trim() ||
    null;
  const sourceHandle =
    asHandle(data.enriched?.sourceHandle) ??
    asHandle(data.author?.handle) ??
    asHandle(data.author?.username) ??
    asHandle(data.sourceHandle) ??
    null;
  const sourceAvatarUrl =
    asHttpUrl(data.enriched?.sourceAvatarUrl) ??
    asHttpUrl(data.author?.profileImageUrl) ??
    asHttpUrl(data.author?.avatarUrl) ??
    asHttpUrl(data.sourceAvatarUrl);
  const sourceVerified =
    data.enriched?.sourceVerified === true ||
    data.author?.verified === true ||
    data.author?.isVerified === true ||
    data.sourceVerified === true;

  const lat =
    data.lat !== undefined
      ? asFiniteNumber(data.lat)
      : asFiniteNumber(data.enriched?.lat);
  const lng =
    data.lng !== undefined
      ? asFiniteNumber(data.lng)
      : asFiniteNumber(data.enriched?.lng);
  const impactScore =
    data.impactScore !== undefined
      ? asImpactScore(data.impactScore)
      : asImpactScore(data.enriched?.impactScore);
  const category =
    data.category !== undefined
      ? asCategory(data.category)
      : asCategory(data.enriched?.category);
  const enrichmentProvider =
    trimStr(data.enrichmentProvider) ?? trimStr(data.enriched?.enrichmentProvider);
  /** Do not persist neutral 50 without provider — see factory placeholderImpact50. */
  const impactForPersistence =
    impactScore === 50 && enrichmentProvider == null ? null : impactScore;
  const enrichmentModel =
    trimStr(data.enrichmentModel) ?? trimStr(data.enriched?.enrichmentModel);
  const enrichmentConfidence =
    data.enrichmentConfidence !== undefined
      ? asFiniteNumber(data.enrichmentConfidence)
      : asFiniteNumber(data.enriched?.enrichmentConfidence);

  await processIntelRaw({
    id: data.id,
    text,
    source: "X",
    sourceUrl,
    timestamp,
    enrichmentOverrides: {
      lat,
      lng,
      impactScore: impactForPersistence,
      category,
      enrichmentProvider,
      enrichmentModel,
      enrichmentConfidence,
    },
    enriched: {
      canonicalSourceUrl: asHttpUrl(data.enriched?.canonicalSourceUrl) ?? sourceUrl,
      sourceDisplayName,
      sourceHandle,
      sourceIconKey: "x",
      sourceAvatarUrl,
      sourceVerified,
      trustTier: data.enriched?.trustTier ?? undefined,
      trustScore: data.enriched?.trustScore ?? undefined,
      mediaUrls:
        data.enriched?.mediaUrls
          ?.map((u) => asHttpUrl(u))
          .filter((u): u is string => Boolean(u)) ?? undefined,
    },
  });

  // Enforce webhook-provided enrichment on persisted signal row for this id.
  // This is a safety net for stale/default rows that can survive dedupe paths.
  const forcedSignalUpdates: Partial<typeof signals.$inferInsert> = {};
  if (lat != null) forcedSignalUpdates.lat = lat;
  if (lng != null) forcedSignalUpdates.lng = lng;
  if (impactForPersistence != null) {
    forcedSignalUpdates.impactScore = impactForPersistence;
  }
  if (category != null) forcedSignalUpdates.category = category;
  if (enrichmentProvider != null) {
    forcedSignalUpdates.enrichmentProvider = enrichmentProvider;
  }
  if (enrichmentModel != null) {
    forcedSignalUpdates.enrichmentModel = enrichmentModel;
  }
  if (enrichmentConfidence != null) {
    forcedSignalUpdates.enrichmentConfidence = enrichmentConfidence;
  }
  if (Object.keys(forcedSignalUpdates).length > 0) {
    await db.update(signals).set(forcedSignalUpdates).where(eq(signals.id, data.id));
  }

  const normalizedPayload = {
    id: data.id,
    text,
    source: "X" as const,
    url: sourceUrl,
    twitterUrl: sourceUrl,
    sourceUrl,
    lat,
    lng,
    impactScore: impactForPersistence,
    category,
    enrichmentProvider,
    enrichmentModel,
    enrichmentConfidence,
    timestamp: timestamp?.toISOString() ?? new Date().toISOString(),
    createdAt: timestamp?.toISOString() ?? new Date().toISOString(),
    enriched: {
      canonicalSourceUrl: asHttpUrl(data.enriched?.canonicalSourceUrl) ?? sourceUrl,
      sourceDisplayName,
      sourceHandle,
      sourceIconKey: "x",
      sourceAvatarUrl,
      sourceVerified,
      trustTier: data.enriched?.trustTier ?? undefined,
      trustScore: data.enriched?.trustScore ?? undefined,
      lat,
      lng,
      impactScore: impactForPersistence,
      category,
      enrichmentConfidence,
      enrichmentProvider,
      enrichmentModel,
      mediaUrls:
        data.enriched?.mediaUrls
          ?.map((u) => asHttpUrl(u))
          .filter((u): u is string => Boolean(u)) ?? [],
    },
  };

  const incomingEventId = await createIncomingEventRecord({
    externalEventId: data.id,
    source: "X",
    text,
    sourceUrl,
    sourceDisplayName,
    sourceHandle,
    sourceAvatarUrl: sourceAvatarUrl ?? null,
    sourceVerified,
    payload: raw as Record<string, unknown>,
    meta:
      data.meta && typeof data.meta === "object"
        ? (data.meta as Record<string, unknown>)
        : {},
  });

  const fanout = await fanoutSignalCreatedEvent({
    payload: normalizedPayload as Record<string, unknown>,
    meta:
      data.meta && typeof data.meta === "object"
        ? (data.meta as Record<string, unknown>)
        : {},
    incomingEventId,
  });

  return {
    ok: true as const,
    status: 200,
    body: { ok: true, processed: 1, mode: "direct", fanout },
  };
}

export async function POST(req: Request) {
  try {
    const secret = process.env.X_WEBHOOK_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const rawPayload: unknown = await req.json();
    const direct = await ingestDirectPayload(rawPayload);
    return NextResponse.json(direct.body, { status: direct.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : null;
    return NextResponse.json(
      { ok: false, error: message, cause },
      { status: 500 },
    );
  }
}
