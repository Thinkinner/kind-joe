import { db } from "@/db";
import { signals } from "@/db/schema";
import { analyzeSignalWithAI } from "./ai";
import { and, eq, gt, sql } from "drizzle-orm";
import Pusher from "pusher";

// 1. Initialize Pusher with a timeout safety
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
  timeout: 5000, // 5 second timeout to prevent hanging
});

// --- CONFIGURATION ---
const URGENT_KEYWORDS = [
  "breaking",
  "alert",
  "urgent",
  "explosion",
  "attack",
  "market",
  "nuclear",
  "strike",
  "earthquake",
  "tsunami",
];

const MAX_SIGNALS_PER_HOUR = 1000; // Protection from AI cost spikes

/**
 * INTEL FACTORY
 * Standardizes raw input from any source into a professional signal.
 */
export async function processIntelRaw(params: {
  id: string;
  text: string;
  source: "X" | "Telegram" | "RSS";
  timestamp?: Date;
}) {
  const { id, text, source, timestamp = new Date() } = params;

  // 1. FAST FILTER: Skip non-urgent/low-value short messages
  const isUrgent = URGENT_KEYWORDS.some((word) =>
    text.toLowerCase().includes(word),
  );
  if (!isUrgent && text.length < 45) {
    console.log(`[FACTORY] 🤐 Filtered: Content too low-value from ${source}`);
    return null;
  }

  try {
    // 2. CIRCUIT BREAKER: Check if we have exceeded the hourly AI limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [stats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(signals)
      .where(gt(signals.timestamp, oneHourAgo));

    if (stats.count >= MAX_SIGNALS_PER_HOUR) {
      console.error(
        `[FACTORY] 🛑 CIRCUIT BREAKER: Limit reached (${stats.count}). AI blocked.`,
      );
      return null;
    }

    // 3. AI EDITING: Use Gemini to rewrite and geocode
    console.log(`[FACTORY] 🧠 Analyzing intel from ${source}...`);
    const aiData = await analyzeSignalWithAI(
      text,
      `System: Real-time firehose [${source}]`,
    );

    if (!aiData || aiData.category === "Ignore") {
      console.log(`[FACTORY] 🤫 AI assigned 'Ignore' category.`);
      return null;
    }

    // 4. SEMANTIC DEDUPLICATION: Ensure we don't post the same story twice
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await db
      .select()
      .from(signals)
      .where(
        and(
          eq(signals.headline, aiData.intelHeadline),
          gt(signals.timestamp, thirtyMinsAgo),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `[FACTORY] ⏩ Duplicate story blocked: "${aiData.intelHeadline}"`,
      );
      return null;
    }

    // 5. VALIDATE DATE: Future-proof and convert to UTC
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

    // 6. PERSIST TO DATABASE
    const inserted = await db
      .insert(signals)
      .values(newSignal)
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      console.log(`✅ [FACTORY] Signal Saved: ${newSignal.headline}`);

      // 7. BROADCAST: Send to Globe via Pusher
      // We explicitly AWAIT this so Vercel doesn't kill the task mid-send
      try {
        console.log(`📡 [PUSHER] Broadcasting to channel 'aether-live'...`);

        await pusher.trigger("aether-live", "new-signal", {
          ...newSignal,
          // CRITICAL: Convert Date object to Number for frontend compatibility
          timestamp: newSignal.timestamp.getTime(),
        });

        console.log(`✨ [PUSHER] Broadcast successful.`);
      } catch (pusherErr: any) {
        console.error(`❌ [PUSHER] Trigger failed: ${pusherErr.message}`);
      }

      return newSignal;
    } else {
      console.log(`⏩ [FACTORY] ID collision, signal already exists.`);
    }
  } catch (error) {
    console.error(`[FACTORY] CRITICAL SYSTEM ERROR:`, error);
  }
  return null;
}
