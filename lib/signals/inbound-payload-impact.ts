/**
 * Read impact score and enrichment-shaped fields from webhook JSON stored in
 * `incoming_events.payload` (or equivalent live payloads). Root + `enriched` / `enrichment`.
 */

import type { Category, SignalTrustTier } from "@/lib/aggregator/types";

function asLooseRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function impactFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const r = Math.round(value);
    if (r < 0 || r > 100) return null;
    return r;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (!Number.isFinite(n)) return null;
    const r = Math.round(n);
    if (r < 0 || r > 100) return null;
    return r;
  }
  return null;
}

/** Best impact score from a webhook body stored as `incoming_events.payload`, or null if absent. */
export function parseInboundPayloadImpactScore(
  payload: Record<string, unknown>,
): number | null {
  const root = payload;
  const enriched =
    asLooseRecord(root.enriched) ?? asLooseRecord(root.enrichment);
  const wrapped = asLooseRecord(root.payload);

  return (
    impactFromUnknown(root.impactScore) ??
    impactFromUnknown(root.impact_score) ??
    (enriched
      ? impactFromUnknown(enriched.impactScore) ??
        impactFromUnknown(enriched.impact_score)
      : null) ??
    (wrapped
      ? impactFromUnknown(wrapped.impactScore) ??
        impactFromUnknown(wrapped.impact_score)
      : null)
  );
}

function coordFromUnknown(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function strFromUnknown(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    }
  }
  return null;
}

function confidenceFromUnknown(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function trustTierFromUnknown(...vals: unknown[]): SignalTrustTier | null {
  for (const v of vals) {
    if (v === "low" || v === "medium" || v === "high") return v;
  }
  return null;
}

function mediaUrlsFromUnknown(
  root: Record<string, unknown>,
  en: Record<string, unknown> | undefined,
): string[] | null {
  const pick = (v: unknown): string[] | null => {
    if (!Array.isArray(v)) return null;
    const out = v
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 8);
    return out.length > 0 ? out : null;
  };
  return pick(root.mediaUrls) ?? pick(en?.mediaUrls) ?? null;
}

export type IncomingWebhookPayloadOverlay = {
  impactScore: number | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  mediaUrls: string[] | null;
  enrichmentProvider: string | null;
  enrichmentModel: string | null;
  enrichmentConfidence: number | null;
  sourceDisplayName: string | null;
  sourceHandle: string | null;
  sourceAvatarUrl: string | null;
  sourceVerified: boolean | null;
  trustTier: SignalTrustTier | null;
  trustScore: number | null;
  canonicalSourceUrl: string | null;
  sourceIconKey: string | null;
};

/** Fields to overlay on a `Signal` when displaying from `incoming_events.payload`. */
export function parseIncomingWebhookPayloadOverlay(
  payload: Record<string, unknown>,
): IncomingWebhookPayloadOverlay {
  const root = payload;
  const wrapped = asLooseRecord(root.payload);
  const en =
    asLooseRecord(root.enriched) ??
    asLooseRecord(root.enrichment) ??
    asLooseRecord(wrapped?.enriched) ??
    asLooseRecord(wrapped?.enrichment) ??
    undefined;

  const lat = coordFromUnknown(
    root.lat,
    root.latitude,
    wrapped?.lat,
    wrapped?.latitude,
    en?.lat,
    en?.latitude,
  );
  const lng = coordFromUnknown(
    root.lng,
    root.longitude,
    wrapped?.lng,
    wrapped?.longitude,
    en?.lng,
    en?.longitude,
  );

  const category = strFromUnknown(
    root.category,
    wrapped?.category,
    en?.category,
  );

  return {
    impactScore: parseInboundPayloadImpactScore(payload),
    lat,
    lng,
    category,
    mediaUrls:
      mediaUrlsFromUnknown(root, en) ??
      (wrapped ? mediaUrlsFromUnknown(wrapped, en) : null),
    enrichmentProvider: strFromUnknown(
      root.enrichmentProvider,
      root.enrichment_provider,
      wrapped?.enrichmentProvider,
      wrapped?.enrichment_provider,
      en?.enrichmentProvider,
      en?.enrichment_provider,
    ),
    enrichmentModel: strFromUnknown(
      root.enrichmentModel,
      root.enrichment_model,
      wrapped?.enrichmentModel,
      wrapped?.enrichment_model,
      en?.enrichmentModel,
      en?.enrichment_model,
    ),
    enrichmentConfidence: confidenceFromUnknown(
      root.enrichmentConfidence,
      root.enrichment_confidence,
      wrapped?.enrichmentConfidence,
      wrapped?.enrichment_confidence,
      en?.enrichmentConfidence,
      en?.enrichment_confidence,
    ),
    sourceDisplayName: strFromUnknown(
      root.sourceDisplayName,
      root.source_display_name,
      wrapped?.sourceDisplayName,
      wrapped?.source_display_name,
      en?.sourceDisplayName,
      en?.source_display_name,
    ),
    sourceHandle: strFromUnknown(
      root.sourceHandle,
      root.source_handle,
      wrapped?.sourceHandle,
      wrapped?.source_handle,
      en?.sourceHandle,
      en?.source_handle,
    ),
    sourceAvatarUrl: strFromUnknown(
      root.sourceAvatarUrl,
      root.source_avatar_url,
      wrapped?.sourceAvatarUrl,
      wrapped?.source_avatar_url,
      en?.sourceAvatarUrl,
      en?.source_avatar_url,
    ),
    sourceVerified:
      root.sourceVerified === true ||
      root.source_verified === true ||
      wrapped?.sourceVerified === true ||
      wrapped?.source_verified === true ||
      en?.sourceVerified === true ||
      en?.source_verified === true
        ? true
        : root.sourceVerified === false ||
            root.source_verified === false ||
            wrapped?.sourceVerified === false ||
            wrapped?.source_verified === false ||
            en?.sourceVerified === false ||
            en?.source_verified === false
          ? false
          : null,
    trustTier: trustTierFromUnknown(
      root.trustTier,
      wrapped?.trustTier,
      en?.trustTier,
    ),
    trustScore:
      impactFromUnknown(root.trustScore) ??
      impactFromUnknown(wrapped?.trustScore) ??
      impactFromUnknown(en?.trustScore),
    canonicalSourceUrl: strFromUnknown(
      root.canonicalSourceUrl,
      root.canonical_source_url,
      wrapped?.canonicalSourceUrl,
      wrapped?.canonical_source_url,
      en?.canonicalSourceUrl,
      en?.canonical_source_url,
    ),
    sourceIconKey: strFromUnknown(
      root.sourceIconKey,
      root.source_icon_key,
      wrapped?.sourceIconKey,
      wrapped?.source_icon_key,
      en?.sourceIconKey,
      en?.source_icon_key,
    ),
  };
}

const DISPLAY_CATEGORY_SET = new Set<string>([
  "World",
  "Military",
  "Finance",
  "Environment",
  "Energy",
  "Tech",
  "Health",
  "Society",
]);

export function isDisplayCategory(
  raw: string | null | undefined,
): raw is Category {
  return typeof raw === "string" && DISPLAY_CATEGORY_SET.has(raw);
}
