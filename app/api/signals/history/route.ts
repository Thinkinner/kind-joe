'use server';

import { getSignalsFromDB, syncRealTimeNews } from "@/lib/aggregator";
import { Signal } from "@/lib/aggregator/types";

// 1. FAST: Just get what is already in the database
export async function getHistory(): Promise<Signal[]> {
  const rawData = await getSignalsFromDB();
  return rawData.map((s) => ({
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
    timestamp: s.timestamp ? s.timestamp.getTime() : Date.now(),
    tags: (s.tags as string[]) ?? [],
  }));
}

// 2. SLOW: Trigger the RSS + Gemini AI Sync
export async function triggerSync() {
  await syncRealTimeNews();
}