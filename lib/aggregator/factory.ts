import { db } from "@/db";
import { signals } from "@/db/schema";
import { analyzeSignalWithAI } from "./ai";
import { and, eq, gt, sql } from "drizzle-orm";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// --- CONFIGURATION ---
const URGENT_KEYWORDS = [
  "breaking", "alert", "urgent", "explosion", "attack", 
  "market", "nuclear", "strike", "earthquake", "tsunami",
];

const MAX_SIGNALS_PER_HOUR = 60; // 💸 Safety: Max 60 AI calls per hour (1 per minute avg)

export async function processIntelRaw(params: {
  id: string;
  text: string;
  source: "X" | "Telegram" | "RSS";
  timestamp?: Date;
}) {
  const { id, text, source, timestamp = new Date() } = params;

  // 1. FAST FILTER: Skip non-urgent tiny messages
  const isUrgent = URGENT_KEYWORDS.some((word) => text.toLowerCase().includes(word));
  if (!isUrgent && text.length < 45) {
    console.log(`[FACTORY] 🤐 Skipping low-value text from ${source}`);
    return null;
  }

  try {
    // 2. 🛡️ CIRCUIT BREAKER: Check DB volume for the last hour
    // This prevents a "News Explosion" from draining your AI credits.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Efficiently count records in the last hour
    const [stats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(signals)
      .where(gt(signals.timestamp, oneHourAgo));

    if (stats.count >= MAX_SIGNALS_PER_HOUR) {
      console.error(`[FACTORY] 🛑 CIRCUIT BREAKER ACTIVE: ${stats.count} signals in last hour. AI call blocked to save costs.`);
      return null;
    }

    // 3. 🧠 AI ANALYSIS: Transform raw text into Intel
    console.log(`[FACTORY] 🧠 [${stats.count}/${MAX_SIGNALS_PER_HOUR}] AI analyzing ${source}...`);
    const aiData = await analyzeSignalWithAI(text, `Source: ${source} raw input`);

    if (!aiData || aiData.category === "Ignore") {
       console.log(`[FACTORY] 🤫 AI categorized as Ignore.`);
       return null;
    }

    // 4. 🛡️ SEMANTIC DEDUPLICATION: Check for identical headlines
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await db
      .select()
      .from(signals)
      .where(and(eq(signals.headline, aiData.intelHeadline), gt(signals.timestamp, thirtyMinsAgo)))
      .limit(1);

    if (existing.length > 0) {
      console.log(`[FACTORY] ⏩ Semantic duplicate blocked: "${aiData.intelHeadline}"`);
      return null;
    }

    // 5. PREPARE & PERSIST
    const now = new Date();
    const finalDate = timestamp > now ? now : timestamp;

    const newSignal = {
      id,
      headline: aiData.intelHeadline,
      summary: aiData.intelSummary,
      source,
      category: aiData.category,
      lat: aiData.lat,
      lng: aiData.lng,
      city: aiData.city,
      country: aiData.country,
      impactScore: aiData.impactScore,
      tags: aiData.tags,
      timestamp: finalDate,
    };

    const inserted = await db.insert(signals).values(newSignal).onConflictDoNothing().returning();

    if (inserted.length > 0) {
      // 6. BROADCAST
      console.log(`[FACTORY] 🔥 LIVE: ${newSignal.headline}`);
      await pusher.trigger("aether-live", "new-signal", {
        ...newSignal,
        timestamp: newSignal.timestamp.getTime(),
      });
      return newSignal;
    }

  } catch (error) {
    console.error(`[FACTORY] Fatal Error:`, error);
  }
  return null;
}