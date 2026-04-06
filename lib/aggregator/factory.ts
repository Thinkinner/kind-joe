/** Signal ingest: DB + Pusher only; no Google GenAI (see `verbatim-signal.ts`). */
import { db } from "@/db";
import { signals } from "@/db/schema";
import { buildVerbatimSignalFields } from "./verbatim-signal";
import type { Category, Source } from "./types";
import { eq } from "drizzle-orm";
import Pusher from "pusher";
import {
  canonicalizeSignalUrl,
  deriveSignalIdentity,
  deriveTrustMetadata,
  extractMediaUrls,
  markdownToPlainText,
  normalizeSignalBodyText,
} from "@/lib/signals/signal-enrichment";
import { agentDebugIngest } from "@/lib/debug/agent-e68134-log";
import { hasPlausibleLatLng } from "@/lib/signals/plausible-coords";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

/** Pusher per-event payload limit is ~10KB; keep headroom for other JSON fields. */
const PUSHER_SUMMARY_MAX_CHARS = 7000;
const HTTP_URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

function pusherNewSignalPayload(newSignal: {
  summary: string | null;
  timestamp: Date;
  [key: string]: unknown;
}) {
  const base = {
    ...newSignal,
    timestamp: newSignal.timestamp.getTime(),
  };
  const s = base.summary ?? "";
  if (s.length <= PUSHER_SUMMARY_MAX_CHARS) return base;
  return {
    ...base,
    summary: `${s.slice(0, PUSHER_SUMMARY_MAX_CHARS)}…`,
  };
}

function dedupePlainTextUrls(raw: string): string {
  const seen = new Set<string>();
  const deduped = raw.replace(HTTP_URL_RE, (url) => {
    const trimmed = url.replace(/[),.;!?]+$/g, "");
    const canonical = canonicalizeSignalUrl(trimmed) ?? trimmed;
    const key = canonical.toLowerCase();
    if (seen.has(key)) return "";
    seen.add(key);
    return canonical;
  });
  return deduped.replace(/\s{2,}/g, " ").trim();
}

export async function processIntelRaw(params: {
  id: string;
  text: string;
  source: Source;
  timestamp?: Date;
  /** Original story URL (RSS `link`, etc.); null when unknown. */
  sourceUrl?: string | null;
  /** RSS title (e.g. USGS); otherwise first line of `text` is used. */
  headline?: string | null;
  /** Epicenter / pin when known (e.g. USGS Atom georss:point). */
  lat?: number | null;
  lng?: number | null;
  enrichmentOverrides?: {
    lat?: number | null;
    lng?: number | null;
    impactScore?: number | null;
    category?: Category | null;
    enrichmentProvider?: string | null;
    enrichmentModel?: string | null;
    enrichmentConfidence?: number | null;
  };
  /** Optional worker-enriched source identity + media metadata. */
  enriched?: {
    canonicalSourceUrl?: string | null;
    sourceDisplayName?: string | null;
    sourceHandle?: string | null;
    sourceIconKey?: string | null;
    sourceAvatarUrl?: string | null;
    sourceVerified?: boolean | null;
    trustTier?: "low" | "medium" | "high" | null;
    trustScore?: number | null;
    mediaUrls?: string[] | null;
  };
}) {
  const {
    id,
    text,
    source,
    sourceUrl = null,
    headline = null,
    lat = null,
    lng = null,
    enrichmentOverrides,
    enriched,
  } = params;
  const timestamp = params.timestamp ?? new Date();

  try {
    console.log(`-----------------------------------------`);
    console.log(
      `📥 [FACTORY] Ingesting from ${source}: ${text.slice(0, 50)}...`,
    );

    const fields = buildVerbatimSignalFields({
      text,
      source,
      sourceUrl,
      headline,
      lat,
      lng,
    });
    const normalizedSummary = dedupePlainTextUrls(
      normalizeSignalBodyText(fields.summary),
    );
    const normalizedHeadline = dedupePlainTextUrls(
      markdownToPlainText(fields.headline).slice(0, 512),
    );

    const hasOverride = <K extends keyof NonNullable<typeof enrichmentOverrides>>(
      key: K,
    ) =>
      Boolean(
        enrichmentOverrides &&
          Object.prototype.hasOwnProperty.call(enrichmentOverrides, key),
      );

    const resolvedLat = hasOverride("lat")
      ? (enrichmentOverrides?.lat ?? null)
      : fields.lat;
    const resolvedLng = hasOverride("lng")
      ? (enrichmentOverrides?.lng ?? null)
      : fields.lng;
    const resolvedImpactScore = hasOverride("impactScore")
      ? (enrichmentOverrides?.impactScore ?? null)
      : fields.impactScore;
    const providerTrim =
      typeof enrichmentOverrides?.enrichmentProvider === "string"
        ? enrichmentOverrides.enrichmentProvider.trim()
        : "";
    /** TweetShift / partial webhooks often send 50 with no provider; that locks rows before Gemini arrives. */
    const placeholderImpact50 =
      resolvedImpactScore === 50 && providerTrim.length === 0;
    const persistenceImpactScore = placeholderImpact50
      ? null
      : resolvedImpactScore;

    // #region agent log
    agentDebugIngest({
      runId: "verify-file",
      hypothesisId: "H2-H3",
      location: "factory.ts:persistenceImpact",
      message: "factory impact resolution",
      data: {
        id: id.slice(0, 48),
        resolvedImpactScore,
        providerTrimLen: providerTrim.length,
        placeholderImpact50,
        persistenceImpactScore,
        hasOverrideImpact: hasOverride("impactScore"),
      },
    });
    // #endregion

    const resolvedCategory = hasOverride("category")
      ? (enrichmentOverrides?.category ?? null)
      : fields.category;
    const incomingHasGeo =
      typeof resolvedLat === "number" &&
      typeof resolvedLng === "number" &&
      hasPlausibleLatLng(resolvedLat, resolvedLng);

    const already = await db
      .select({
        id: signals.id,
        category: signals.category,
        lat: signals.lat,
        lng: signals.lng,
        city: signals.city,
        country: signals.country,
        geographicScope: signals.geographicScope,
        adminArea: signals.adminArea,
        impactScore: signals.impactScore,
        enrichmentProvider: signals.enrichmentProvider,
        enrichmentModel: signals.enrichmentModel,
        enrichmentConfidence: signals.enrichmentConfidence,
        timestamp: signals.timestamp,
      })
      .from(signals)
      .where(eq(signals.id, id))
      .limit(1);
    if (already.length > 0) {
      const existing = already[0];

      const updates: Partial<typeof signals.$inferInsert> = {};
      updates.summary = normalizedSummary;
      if (hasOverride("lat") && resolvedLat !== null) {
        updates.lat = resolvedLat;
      }
      if (hasOverride("lng") && resolvedLng !== null) {
        updates.lng = resolvedLng;
      }
      if ((hasOverride("lat") || hasOverride("lng")) && incomingHasGeo) {
        updates.city = fields.city;
        updates.country = fields.country;
        updates.geographicScope = fields.geographicScope;
        updates.adminArea = fields.adminArea || null;
      }

      // Webhooks pass full override objects; null must mean "omit" — never wipe a good row.
      if (hasOverride("impactScore") && persistenceImpactScore !== null) {
        updates.impactScore = persistenceImpactScore;
      }

      if (hasOverride("category") && resolvedCategory !== null) {
        updates.category = resolvedCategory;
      }

      if (
        hasOverride("enrichmentProvider") &&
        enrichmentOverrides?.enrichmentProvider != null
      ) {
        updates.enrichmentProvider = enrichmentOverrides.enrichmentProvider;
      }
      if (
        hasOverride("enrichmentModel") &&
        enrichmentOverrides?.enrichmentModel != null
      ) {
        updates.enrichmentModel = enrichmentOverrides.enrichmentModel;
      }
      if (
        hasOverride("enrichmentConfidence") &&
        enrichmentOverrides?.enrichmentConfidence != null
      ) {
        updates.enrichmentConfidence = enrichmentOverrides.enrichmentConfidence;
      }

      const canonicalSourceUrl =
        canonicalizeSignalUrl(enriched?.canonicalSourceUrl) ??
        canonicalizeSignalUrl(sourceUrl);
      if (canonicalSourceUrl) {
        updates.canonicalSourceUrl = canonicalSourceUrl;
      }
      if (enriched?.sourceDisplayName?.trim()) {
        updates.sourceDisplayName = enriched.sourceDisplayName.trim();
      }
      if (enriched?.sourceHandle?.trim()) {
        updates.sourceHandle = enriched.sourceHandle.trim();
      }
      if (enriched?.sourceIconKey?.trim()) {
        updates.sourceIconKey = enriched.sourceIconKey.trim();
      }
      if (enriched?.sourceAvatarUrl) {
        updates.sourceAvatarUrl = canonicalizeSignalUrl(enriched.sourceAvatarUrl);
      }
      if (typeof enriched?.sourceVerified === "boolean") {
        updates.sourceVerified = enriched.sourceVerified;
      }
      if (enriched?.trustTier) {
        updates.trustTier = enriched.trustTier;
      }
      if (typeof enriched?.trustScore === "number") {
        updates.trustScore = Math.max(0, Math.min(100, Math.round(enriched.trustScore)));
      }
      if (Array.isArray(enriched?.mediaUrls) && enriched.mediaUrls.length > 0) {
        updates.mediaUrls = enriched.mediaUrls
          .map((u) => canonicalizeSignalUrl(u) ?? null)
          .filter((u): u is string => typeof u === "string")
          .slice(0, 6);
      }

      // #region agent log
      agentDebugIngest({
        runId: "verify-file",
        hypothesisId: "H3-H4",
        location: "factory.ts:existingRowUpdates",
        message: "existing id update payload",
        data: {
          id: id.slice(0, 48),
          updateKeys: Object.keys(updates),
          updateImpact: updates.impactScore ?? null,
          updateProvider: updates.enrichmentProvider ?? null,
          updatesCount: Object.keys(updates).length,
        },
      });
      // #endregion

      if (Object.keys(updates).length > 0) {
        const upgraded = await db
          .update(signals)
          .set(updates)
          .where(eq(signals.id, id))
          .returning();
        if (upgraded.length > 0) {
          console.log(`♻️ [FACTORY] Upgraded existing id with enrichment: ${id.slice(0, 48)}…`);
          // #region agent log
          agentDebugIngest({
            runId: "verify-file",
            hypothesisId: "H4",
            location: "factory.ts:afterDbUpgrade",
            message: "row after upgrade returning",
            data: {
              id: id.slice(0, 48),
              dbImpact: upgraded[0].impactScore ?? null,
              dbProvider: upgraded[0].enrichmentProvider ?? null,
            },
          });
          // #endregion
          await pusher.trigger(
            "aether-live",
            "new-signal",
            pusherNewSignalPayload({
              ...upgraded[0],
              timestamp: upgraded[0].timestamp ?? existing.timestamp ?? new Date(),
            }),
          );
          return upgraded[0];
        }
      }

      console.log(`⏩ [FACTORY] Skip existing id: ${id.slice(0, 48)}…`);
      return null;
    }

    const canonicalSourceUrl =
      canonicalizeSignalUrl(enriched?.canonicalSourceUrl) ??
      canonicalizeSignalUrl(sourceUrl);
    const identity = deriveSignalIdentity(source, canonicalSourceUrl);
    const trust = deriveTrustMetadata(source);
    const mediaUrls =
      Array.isArray(enriched?.mediaUrls) && enriched.mediaUrls.length > 0
        ? enriched.mediaUrls
            .map((u) => canonicalizeSignalUrl(u) ?? null)
            .filter((u): u is string => typeof u === "string")
            .slice(0, 6)
        : extractMediaUrls(normalizedSummary, canonicalSourceUrl);

    const now = new Date();
    const newSignal = {
      id,
      headline: normalizedHeadline || fields.headline,
      summary: normalizedSummary,
      source,
      sourceUrl: canonicalSourceUrl ?? sourceUrl,
      canonicalSourceUrl,
      sourceDisplayName: enriched?.sourceDisplayName?.trim() || identity.sourceDisplayName,
      sourceHandle: enriched?.sourceHandle?.trim() || identity.sourceHandle,
      sourceIconKey: enriched?.sourceIconKey?.trim() || identity.sourceIconKey,
      sourceAvatarUrl: canonicalizeSignalUrl(enriched?.sourceAvatarUrl),
      sourceVerified: enriched?.sourceVerified === true,
      trustTier: enriched?.trustTier ?? trust.trustTier,
      trustScore:
        typeof enriched?.trustScore === "number"
          ? Math.max(0, Math.min(100, Math.round(enriched.trustScore)))
          : trust.trustScore,
      mediaUrls,
      category: resolvedCategory,
      lat: resolvedLat,
      lng: resolvedLng,
      enrichmentProvider:
        hasOverride("enrichmentProvider")
          ? (enrichmentOverrides?.enrichmentProvider ?? null)
          : null,
      enrichmentModel:
        hasOverride("enrichmentModel")
          ? (enrichmentOverrides?.enrichmentModel ?? null)
          : null,
      enrichmentConfidence:
        hasOverride("enrichmentConfidence")
          ? (enrichmentOverrides?.enrichmentConfidence ?? null)
          : null,
      city: fields.city,
      country: fields.country,
      geographicScope: fields.geographicScope,
      adminArea: fields.adminArea || null,
      impactScore:
        persistenceImpactScore !== null
          ? persistenceImpactScore
          : fields.impactScore,
      tags: fields.tags,
      timestamp: timestamp > now ? now : timestamp,
    };

    const inserted = await db
      .insert(signals)
      .values(newSignal)
      .onConflictDoNothing()
      .returning();

    if (inserted.length === 0) {
      console.log(`⏩ [FACTORY] No insert (duplicate or race); skip broadcast.`);
      return null;
    }

    console.log(`✅ [FACTORY] Broadcasting: ${newSignal.headline}`);

    await pusher.trigger(
      "aether-live",
      "new-signal",
      pusherNewSignalPayload(newSignal),
    );

    return newSignal;
  } catch (error) {
    console.error(`[FACTORY] ❌ ERROR:`, error);
    return null;
  }
}
