"use server";

import { getSignalsFromDB } from "@/lib/aggregator";
import { Signal, type GeographicScope } from "@/lib/aggregator/types";
import {
  isDisplayCategory,
  type IncomingWebhookPayloadOverlay,
} from "@/lib/signals/inbound-payload-impact";
import { effectiveImpactScore } from "@/lib/signals/impact-tier";
import { hasPlausibleLatLng } from "@/lib/signals/plausible-coords";
import { getLatestIncomingPayloadOverlaysBySignalIds } from "@/lib/webhooks/incoming-payload-impact";

function applyIncomingOverlay(
  row: Signal,
  overlay: IncomingWebhookPayloadOverlay | undefined,
): Signal {
  if (!overlay) return row;
  const next: Signal = { ...row };

  if (overlay.impactScore != null) {
    next.impactScore = overlay.impactScore;
  }
  if (hasPlausibleLatLng(overlay.lat, overlay.lng)) {
    next.lat = overlay.lat;
    next.lng = overlay.lng;
  }
  if (isDisplayCategory(overlay.category)) {
    next.category = overlay.category;
  }
  if (overlay.mediaUrls && overlay.mediaUrls.length > 0) {
    next.mediaUrls = overlay.mediaUrls;
  }
  if (overlay.sourceDisplayName) {
    next.sourceDisplayName = overlay.sourceDisplayName;
  }
  if (overlay.sourceHandle) {
    next.sourceHandle = overlay.sourceHandle;
  }
  if (overlay.sourceAvatarUrl) {
    next.sourceAvatarUrl = overlay.sourceAvatarUrl;
  }
  if (overlay.sourceIconKey) {
    next.sourceIconKey = overlay.sourceIconKey;
  }
  if (overlay.sourceVerified !== null) {
    next.sourceVerified = overlay.sourceVerified;
  }
  if (overlay.trustTier) {
    next.trustTier = overlay.trustTier;
  }
  if (overlay.trustScore != null) {
    next.trustScore = overlay.trustScore;
  }
  if (overlay.canonicalSourceUrl) {
    next.canonicalSourceUrl = overlay.canonicalSourceUrl;
  }
  if (overlay.enrichmentProvider) {
    next.enrichmentProvider = overlay.enrichmentProvider;
  }
  if (overlay.enrichmentModel) {
    next.enrichmentModel = overlay.enrichmentModel;
  }
  if (overlay.enrichmentConfidence != null) {
    next.enrichmentConfidence = overlay.enrichmentConfidence;
  }

  return next;
}

function normalizeScope(raw: string | null | undefined): GeographicScope {
  const v = (raw ?? "global").toLowerCase().trim();
  if (v === "local" || v === "regional" || v === "national" || v === "global") {
    return v;
  }
  return "global";
}

/** Kind Joe Watch is public; no session required. Admin routes stay staff-only separately. */
export async function checkSignalsAccess(): Promise<boolean> {
  return true;
}

export async function getHistory(): Promise<Signal[]> {
  const rawData = await getSignalsFromDB();
  const overlayById = await getLatestIncomingPayloadOverlaysBySignalIds(
    rawData.map((s) => s.id),
  );
  const now = Date.now();

  const out = rawData.map((s) => {
    let timeValue = s.timestamp ? s.timestamp.getTime() : now;
    if (timeValue > now) {
      timeValue = now;
    }

    const row: Signal = {
      id: s.id,
      headline: s.headline,
      summary: s.summary ?? "",
      source: s.source as Signal["source"],
      sourceUrl: s.sourceUrl?.trim() || undefined,
      category: (s.category as Signal["category"]) ?? "World",
      lat:
        typeof s.lat === "number" &&
        typeof s.lng === "number" &&
        hasPlausibleLatLng(s.lat, s.lng)
          ? s.lat
          : null,
      lng:
        typeof s.lat === "number" &&
        typeof s.lng === "number" &&
        hasPlausibleLatLng(s.lat, s.lng)
          ? s.lng
          : null,
      city: s.city ?? "Unknown",
      country: s.country ?? "Unknown",
      geographicScope: normalizeScope(s.geographicScope),
      adminArea: s.adminArea?.trim() ?? "",
      impactScore: s.impactScore ?? 0,
      timestamp: timeValue,
      tags: (s.tags as string[]) ?? [],
      canonicalSourceUrl: s.canonicalSourceUrl?.trim() || undefined,
      sourceDisplayName: s.sourceDisplayName?.trim() || undefined,
      sourceHandle: s.sourceHandle?.trim() || undefined,
      sourceIconKey: s.sourceIconKey?.trim() || undefined,
      sourceAvatarUrl: s.sourceAvatarUrl?.trim() || undefined,
      sourceVerified: s.sourceVerified ?? false,
      trustTier: (s.trustTier as Signal["trustTier"]) ?? undefined,
      trustScore: s.trustScore ?? undefined,
      mediaUrls: (s.mediaUrls as string[]) ?? [],
      enrichmentProvider: s.enrichmentProvider?.trim() || undefined,
      enrichmentModel: s.enrichmentModel?.trim() || undefined,
      enrichmentConfidence: s.enrichmentConfidence ?? undefined,
    };
    const merged = applyIncomingOverlay(row, overlayById.get(s.id));
    return {
      ...merged,
      impactScore: effectiveImpactScore(merged),
    };
  });

  return out;
}

