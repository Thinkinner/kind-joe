"use server";

import { getSignalsFromDB } from "@/lib/aggregator";
import { Signal, type GeographicScope } from "@/lib/aggregator/types";
import { getServerSession } from "@/lib/auth/server";
import { effectiveImpactScore } from "@/lib/signals/impact-tier";

function normalizeScope(raw: string | null | undefined): GeographicScope {
  const v = (raw ?? "global").toLowerCase().trim();
  if (v === "local" || v === "regional" || v === "national" || v === "global") {
    return v;
  }
  return "global";
}

export async function checkSignalsAccess(): Promise<boolean> {
  const session = await getServerSession();
  return Boolean(session?.user);
}

export async function getHistory(): Promise<Signal[]> {
  const rawData = await getSignalsFromDB();
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
      lat: typeof s.lat === "number" ? s.lat : null,
      lng: typeof s.lng === "number" ? s.lng : null,
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
    return {
      ...row,
      impactScore: effectiveImpactScore(row),
    };
  });

  return out;
}

