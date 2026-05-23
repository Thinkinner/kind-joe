import { db } from "@/db";
import { incomingEvents, signals } from "@/db/schema";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function clampIngestLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, n));
}

export type IncomingEventCursor = { t: string; id: number };

export function encodeIncomingCursor(row: {
  receivedAt: Date;
  id: number;
}): string {
  const payload: IncomingEventCursor = {
    t: row.receivedAt.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeIncomingCursor(
  encoded: string | null,
): IncomingEventCursor | null {
  if (!encoded?.trim()) return null;
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.t !== "string" || typeof o.id !== "number") return null;
    if (!Number.isFinite(o.id)) return null;
    return { t: o.t, id: o.id };
  } catch {
    return null;
  }
}

export type SignalsCursor = { t: string; id: string };

export function encodeSignalsCursor(row: {
  timestamp: Date | null;
  id: string;
}): string {
  const payload: SignalsCursor = {
    t: (row.timestamp ?? new Date(0)).toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeSignalsCursor(encoded: string | null): SignalsCursor | null {
  if (!encoded?.trim()) return null;
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    if (typeof o.t !== "string" || typeof o.id !== "string") return null;
    if (!o.id) return null;
    return { t: o.t, id: o.id };
  } catch {
    return null;
  }
}

export type IncomingEventAdminRow = {
  id: number;
  externalEventId: string | null;
  source: string;
  text: string;
  sourceUrl: string | null;
  sourceDisplayName: string | null;
  sourceHandle: string | null;
  sourceAvatarUrl: string | null;
  sourceVerified: boolean;
  payload: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  receivedAt: string;
  createdAt: string;
  hasMatchingSignal: boolean;
};

export type SignalAdminRow = {
  id: string;
  headline: string;
  summary: string | null;
  source: string;
  sourceUrl: string | null;
  canonicalSourceUrl: string | null;
  sourceDisplayName: string | null;
  sourceHandle: string | null;
  category: string | null;
  impactScore: number | null;
  enrichmentProvider: string | null;
  enrichmentModel: string | null;
  enrichmentConfidence: number | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  country: string | null;
  geographicScope: string;
  trustTier: string | null;
  trustScore: number | null;
  timestamp: string | null;
};

function payloadSignalId(payload: Record<string, unknown>): string | null {
  const id = payload.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export async function listIncomingEventsAdmin(params: {
  limit: number;
  cursor: IncomingEventCursor | null;
}): Promise<{ rows: IncomingEventAdminRow[]; nextCursor: string | null }> {
  const limit = Math.max(1, Math.min(MAX_LIMIT, params.limit));
  const cursor = params.cursor;
  const cursorDate = cursor ? new Date(cursor.t) : null;
  const whereClause =
    cursor && cursorDate && !Number.isNaN(cursorDate.getTime())
      ? or(
          lt(incomingEvents.receivedAt, cursorDate),
          and(
            eq(incomingEvents.receivedAt, cursorDate),
            lt(incomingEvents.id, cursor.id),
          ),
        )
      : undefined;

  const raw = await db
    .select({
      id: incomingEvents.id,
      externalEventId: incomingEvents.externalEventId,
      source: incomingEvents.source,
      text: incomingEvents.text,
      sourceUrl: incomingEvents.sourceUrl,
      sourceDisplayName: incomingEvents.sourceDisplayName,
      sourceHandle: incomingEvents.sourceHandle,
      sourceAvatarUrl: incomingEvents.sourceAvatarUrl,
      sourceVerified: incomingEvents.sourceVerified,
      receivedAt: incomingEvents.receivedAt,
      createdAt: incomingEvents.createdAt,
      payloadSignalId: sql<string | null>`${incomingEvents.payload}->>'id'`,
    })
    .from(incomingEvents)
    .where(whereClause)
    .orderBy(desc(incomingEvents.receivedAt), desc(incomingEvents.id))
    .limit(limit + 1);

  const page = raw.slice(0, limit);
  const next =
    raw.length > limit ? raw[limit]! : null;

  const candidateIds = new Set<string>();
  for (const r of page) {
    const fromPayload =
      typeof r.payloadSignalId === "string" && r.payloadSignalId.trim()
        ? r.payloadSignalId.trim()
        : null;
    if (fromPayload) candidateIds.add(fromPayload);
    if (r.externalEventId?.trim()) candidateIds.add(r.externalEventId.trim());
  }
  const existing = await filterExistingSignalIds([...candidateIds]);

  const rows: IncomingEventAdminRow[] = page.map((r) => {
    const pid =
      typeof r.payloadSignalId === "string" && r.payloadSignalId.trim()
        ? r.payloadSignalId.trim()
        : null;
    const ext = r.externalEventId?.trim() ?? null;
    const hasMatchingSignal =
      (pid !== null && existing.has(pid)) ||
      (ext !== null && existing.has(ext));

    return {
      id: r.id,
      externalEventId: r.externalEventId,
      source: r.source,
      text: r.text,
      sourceUrl: r.sourceUrl,
      sourceDisplayName: r.sourceDisplayName,
      sourceHandle: r.sourceHandle,
      sourceAvatarUrl: r.sourceAvatarUrl,
      sourceVerified: r.sourceVerified,
      payload: null,
      meta: null,
      receivedAt: r.receivedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      hasMatchingSignal,
    };
  });

  const nextCursor = next
    ? encodeIncomingCursor({ receivedAt: next.receivedAt, id: next.id })
    : null;

  return { rows, nextCursor };
}

export async function getIncomingEventDetailById(
  eventId: number,
): Promise<IncomingEventAdminRow | null> {
  const [row] = await db
    .select()
    .from(incomingEvents)
    .where(eq(incomingEvents.id, eventId))
    .limit(1);

  if (!row) return null;

  const pid = payloadSignalId(row.payload);
  const ext = row.externalEventId?.trim() ?? null;
  const existing = await filterExistingSignalIds(
    [pid, ext].filter((id): id is string => Boolean(id)),
  );
  const hasMatchingSignal =
    (pid !== null && existing.has(pid)) ||
    (ext !== null && existing.has(ext));

  return {
    id: row.id,
    externalEventId: row.externalEventId,
    source: row.source,
    text: row.text,
    sourceUrl: row.sourceUrl,
    sourceDisplayName: row.sourceDisplayName,
    sourceHandle: row.sourceHandle,
    sourceAvatarUrl: row.sourceAvatarUrl,
    sourceVerified: row.sourceVerified,
    payload: row.payload,
    meta: row.meta ?? null,
    receivedAt: row.receivedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    hasMatchingSignal,
  };
}

export async function filterExistingSignalIds(
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const unique = [...new Set(ids)].slice(0, 500);
  const rows = await db
    .select({ id: signals.id })
    .from(signals)
    .where(inArray(signals.id, unique));
  return new Set(rows.map((r) => r.id));
}

export async function listSignalsAdmin(params: {
  limit: number;
  cursor: SignalsCursor | null;
}): Promise<{ rows: SignalAdminRow[]; nextCursor: string | null }> {
  const limit = Math.max(1, Math.min(MAX_LIMIT, params.limit));
  const cursor = params.cursor;
  const cursorDate = cursor ? new Date(cursor.t) : null;
  const whereClause =
    cursor && cursorDate && !Number.isNaN(cursorDate.getTime())
      ? or(
          lt(signals.timestamp, cursorDate),
          and(eq(signals.timestamp, cursorDate), lt(signals.id, cursor.id)),
        )
      : undefined;

  const raw = await db
    .select({
      id: signals.id,
      headline: signals.headline,
      summary: signals.summary,
      source: signals.source,
      sourceUrl: signals.sourceUrl,
      canonicalSourceUrl: signals.canonicalSourceUrl,
      sourceDisplayName: signals.sourceDisplayName,
      sourceHandle: signals.sourceHandle,
      category: signals.category,
      impactScore: signals.impactScore,
      enrichmentProvider: signals.enrichmentProvider,
      enrichmentModel: signals.enrichmentModel,
      enrichmentConfidence: signals.enrichmentConfidence,
      lat: signals.lat,
      lng: signals.lng,
      city: signals.city,
      country: signals.country,
      geographicScope: signals.geographicScope,
      trustTier: signals.trustTier,
      trustScore: signals.trustScore,
      timestamp: signals.timestamp,
    })
    .from(signals)
    .where(whereClause)
    .orderBy(desc(signals.timestamp), desc(signals.id))
    .limit(limit + 1);

  const page = raw.slice(0, limit);
  const next = raw.length > limit ? raw[limit]! : null;

  const rows: SignalAdminRow[] = page.map((r) => ({
    id: r.id,
    headline: r.headline,
    summary: r.summary,
    source: r.source,
    sourceUrl: r.sourceUrl,
    canonicalSourceUrl: r.canonicalSourceUrl,
    sourceDisplayName: r.sourceDisplayName,
    sourceHandle: r.sourceHandle,
    category: r.category,
    impactScore: r.impactScore,
    enrichmentProvider: r.enrichmentProvider,
    enrichmentModel: r.enrichmentModel,
    enrichmentConfidence: r.enrichmentConfidence,
    lat: r.lat,
    lng: r.lng,
    city: r.city,
    country: r.country,
    geographicScope: r.geographicScope,
    trustTier: r.trustTier,
    trustScore: r.trustScore,
    timestamp: r.timestamp ? r.timestamp.toISOString() : null,
  }));

  const nextCursor = next
    ? encodeSignalsCursor({
        timestamp: next.timestamp,
        id: next.id,
      })
    : null;

  return { rows, nextCursor };
}
