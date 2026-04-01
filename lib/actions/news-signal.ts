"use server";

import { getSignalsFromDB, syncRealTimeNews } from "@/lib/aggregator";
import { Signal, type GeographicScope } from "@/lib/aggregator/types";
import { getServerSession } from "@/lib/auth/server";

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

/**
 * 1. GET HISTORY (Fast)
 * Reads recent signals from Drizzle (see SIGNALS_HISTORY_LIMIT).
 */
export async function getHistory(): Promise<Signal[]> {
  const rawData = await getSignalsFromDB();
  const now = Date.now(); // Server's current UTC time in milliseconds

  return rawData.map((s) => {
    // 1. Convert DB Date object to Unix Number
    let timeValue = s.timestamp ? s.timestamp.getTime() : now;

    // 2. FUTURE-PROOF: If the database time is somehow ahead of the server, cap it at 'now'
    if (timeValue > now) {
      timeValue = now;
    }

    return {
      id: s.id,
      headline: s.headline,
      summary: s.summary ?? "",
      source: s.source as Signal["source"],
      sourceUrl: s.sourceUrl?.trim() || undefined,
      category: s.category as Signal["category"],
      lat: s.lat,
      lng: s.lng,
      city: s.city ?? "Unknown",
      country: s.country ?? "Unknown",
      geographicScope: normalizeScope(s.geographicScope),
      adminArea: s.adminArea?.trim() ?? "",
      impactScore: s.impactScore ?? 0,
      timestamp: timeValue, // Sending purely universal number to frontend
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
    };
  });
}

/**
 * 2. RUN SYNC (Slow)
 * Triggers the background process.
 */
export async function triggerSync() {
  try {
    await syncRealTimeNews();
  } catch (error) {
    console.error("Sync trigger failed:", error);
  }
}
