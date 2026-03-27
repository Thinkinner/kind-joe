import { db } from "@/db";
import { signals } from "@/db/schema";
import { analyzeSignalWithAI } from "./ai";
import { eq } from "drizzle-orm";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function processIntelRaw(params: {
  id: string;
  text: string;
  source: any;
  timestamp?: Date;
  /** Original story URL (RSS `link`, etc.); null when unknown. */
  sourceUrl?: string | null;
}) {
  const { id, text, source, sourceUrl = null } = params;
  const timestamp = params.timestamp ?? new Date();

  try {
    console.log(`-----------------------------------------`);
    console.log(
      `📥 [FACTORY] Ingesting from ${source}: ${text.slice(0, 50)}...`,
    );

    const already = await db
      .select({ id: signals.id })
      .from(signals)
      .where(eq(signals.id, id))
      .limit(1);
    if (already.length > 0) {
      console.log(`⏩ [FACTORY] Skip existing id (no Gemini): ${id.slice(0, 48)}…`);
      return null;
    }

    // 1. AI Analysis with Speed Tracking
    console.time("Gemini-Analysis");
    const aiData = await analyzeSignalWithAI(text, `Source: ${source}`);
    console.timeEnd("Gemini-Analysis");

    if (!aiData || aiData.category === "Ignore") {
      console.log(`⏩ [FACTORY] Signal discarded by AI (Ignore Category).`);
      return null;
    }

    // 2. Format Signal
    const now = new Date();
    const newSignal = {
      id,
      headline: aiData.intelHeadline,
      summary: aiData.intelSummary,
      source,
      sourceUrl,
      category: aiData.category,
      lat: aiData.lat,
      lng: aiData.lng,
      city: aiData.city,
      country: aiData.country,
      geographicScope: aiData.geographicScope,
      adminArea: aiData.adminArea || null,
      impactScore: aiData.impactScore,
      tags: aiData.tags || [],
      timestamp: timestamp > now ? now : timestamp,
    };

    // 3. Save to DB (onConflictDoNothing handles races / duplicate IDs)
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

    await pusher.trigger("aether-live", "new-signal", {
      ...newSignal,
      timestamp: newSignal.timestamp.getTime(),
    });

    return newSignal;
  } catch (error) {
    console.error(`[FACTORY] ❌ ERROR:`, error);
    return null;
  }
}
