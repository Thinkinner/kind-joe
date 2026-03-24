"use server";

import { getSignalsFromDB, syncRealTimeNews } from "@/lib/aggregator";
import { Signal } from "@/lib/aggregator/types";

/**
 * 1. GET HISTORY (Fast)
 * Loads existing data from Drizzle instantly.
 */
export async function getHistory(): Promise<Signal[]> {
  const rawData = await getSignalsFromDB();
  const now = Date.now();

  return rawData.map((s) => {
    // Determine the safe timestamp (cannot be in the future)
    let timeValue = s.timestamp ? s.timestamp.getTime() : now;

    // Safety check: if DB time is in future relative to server, cap it.
    if (timeValue > now) {
      timeValue = now;
    }

    return {
      id: s.id,
      headline: s.headline,
      summary: s.summary ?? "",
      source: s.source as any,
      category: s.category as any,
      lat: s.lat,
      lng: s.lng,
      city: s.city ?? "Unknown",
      country: s.country ?? "Unknown",
      impactScore: s.impactScore ?? 0,
      timestamp: timeValue,
      tags: (s.tags as string[]) ?? [],
    };
  });
}

/**
 * 2. RUN SYNC (Slow)
 * Background process to fetch new X and RSS data.
 */
export async function triggerSync() {
  try {
    await syncRealTimeNews();
  } catch (error) {
    console.error("Sync trigger failed:", error);
  }
}
