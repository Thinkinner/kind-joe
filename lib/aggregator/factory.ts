/** Signal ingest: DB + Pusher only; no Google GenAI (see `verbatim-signal.ts`). */
import { db } from "@/db";
import { signals } from "@/db/schema";
import { buildVerbatimSignalFields } from "./verbatim-signal";
import type { Source } from "./types";
import { eq } from "drizzle-orm";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

/** Pusher per-event payload limit is ~10KB; keep headroom for other JSON fields. */
const PUSHER_SUMMARY_MAX_CHARS = 7000;

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
}) {
  const {
    id,
    text,
    source,
    sourceUrl = null,
    headline = null,
    lat = null,
    lng = null,
  } = params;
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
      console.log(`⏩ [FACTORY] Skip existing id: ${id.slice(0, 48)}…`);
      return null;
    }

    const fields = buildVerbatimSignalFields({
      text,
      source,
      sourceUrl,
      headline,
      lat,
      lng,
    });

    const now = new Date();
    const newSignal = {
      id,
      headline: fields.headline,
      summary: fields.summary,
      source,
      sourceUrl,
      category: fields.category,
      lat: fields.lat,
      lng: fields.lng,
      city: fields.city,
      country: fields.country,
      geographicScope: fields.geographicScope,
      adminArea: fields.adminArea || null,
      impactScore: fields.impactScore,
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
