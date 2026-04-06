import { db } from "@/db";
import { incomingEvents } from "@/db/schema";
import {
  parseIncomingWebhookPayloadOverlay,
  type IncomingWebhookPayloadOverlay,
} from "@/lib/signals/inbound-payload-impact";
import { desc, inArray, or, sql } from "drizzle-orm";

/**
 * For each signal id, newest matching `incoming_events` row where
 * `external_event_id` equals the id OR `payload->>'id'` equals the id (X-style `x-…`).
 * Parses overlay fields from JSON so history matches webhook payloads when the signals row is stale.
 */
export async function getLatestIncomingPayloadOverlaysBySignalIds(
  signalIds: string[],
): Promise<Map<string, IncomingWebhookPayloadOverlay>> {
  const map = new Map<string, IncomingWebhookPayloadOverlay>();
  if (signalIds.length === 0) return map;

  const unique = [...new Set(signalIds.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    500,
  );
  if (unique.length === 0) return map;

  const payloadIdMatches = unique.map((id) => sql`(payload->>'id') = ${id}`);
  const whereClause =
    payloadIdMatches.length > 0
      ? or(inArray(incomingEvents.externalEventId, unique), ...payloadIdMatches)
      : inArray(incomingEvents.externalEventId, unique);

  const rows = await db
    .select({
      externalEventId: incomingEvents.externalEventId,
      payload: incomingEvents.payload,
      receivedAt: incomingEvents.receivedAt,
    })
    .from(incomingEvents)
    .where(whereClause)
    .orderBy(desc(incomingEvents.receivedAt));

  for (const r of rows) {
    const p = r.payload as Record<string, unknown>;
    const overlay = parseIncomingWebhookPayloadOverlay(p);
    const ext = r.externalEventId?.trim() ?? "";
    const pid = typeof p.id === "string" ? p.id.trim() : "";

    for (const sid of unique) {
      if (map.has(sid)) continue;
      if (sid === ext || sid === pid) {
        map.set(sid, overlay);
      }
    }
    if (map.size === unique.length) break;
  }

  return map;
}
