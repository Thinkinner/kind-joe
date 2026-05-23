import { db } from "@/db";
import {
  incomingEvents,
  outgoingWebhookDeliveries,
  outgoingWebhooks,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

type JsonObject = Record<string, unknown>;

export type IncomingEventRecordInput = {
  externalEventId?: string | null;
  source: string;
  text: string;
  sourceUrl?: string | null;
  sourceDisplayName?: string | null;
  sourceHandle?: string | null;
  sourceAvatarUrl?: string | null;
  sourceVerified?: boolean;
  payload: JsonObject;
  meta?: JsonObject | null;
};

export async function createIncomingEventRecord(input: IncomingEventRecordInput) {
  try {
    const rows = await db
      .insert(incomingEvents)
      .values({
        externalEventId: input.externalEventId ?? null,
        source: input.source,
        text: input.text,
        sourceUrl: input.sourceUrl ?? null,
        sourceDisplayName: input.sourceDisplayName ?? null,
        sourceHandle: input.sourceHandle ?? null,
        sourceAvatarUrl: input.sourceAvatarUrl ?? null,
        sourceVerified: input.sourceVerified === true,
        payload: input.payload,
        meta: input.meta ?? null,
      })
      .returning({ id: incomingEvents.id });
    return rows[0]?.id ?? null;
  } catch (error) {
    throw error;
  }
}

export async function listEnabledOutgoingWebhooks() {
  return db
    .select({
      id: outgoingWebhooks.id,
      name: outgoingWebhooks.name,
      url: outgoingWebhooks.url,
      authorizationToken: outgoingWebhooks.authorizationToken,
    })
    .from(outgoingWebhooks)
    .where(eq(outgoingWebhooks.enabled, true))
    .orderBy(desc(outgoingWebhooks.id));
}

function shortText(value: string, max = 1500): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

async function logWebhookDelivery(params: {
  webhookId: number;
  incomingEventId: number | null;
  status: "success" | "error";
  statusCode?: number | null;
  responseBody?: string | null;
  error?: string | null;
}) {
  await db.insert(outgoingWebhookDeliveries).values({
    webhookId: params.webhookId,
    incomingEventId: params.incomingEventId,
    attempt: 1,
    status: params.status,
    statusCode: params.statusCode ?? null,
    responseBody: params.responseBody ?? null,
    error: params.error ?? null,
  });
}

export async function fanoutSignalCreatedEvent(params: {
  payload: JsonObject;
  meta?: JsonObject | null;
  incomingEventId?: number | null;
}) {
  const hooks = await listEnabledOutgoingWebhooks();
  if (hooks.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const envelope = {
    event: "signal.created",
    payload: params.payload,
    meta: params.meta ?? {},
  };

  let succeeded = 0;
  let failed = 0;

  await Promise.all(
    hooks.map(async (hook) => {
      try {
        const headers: HeadersInit = { "content-type": "application/json" };
        if (hook.authorizationToken?.trim()) {
          headers.authorization = `Bearer ${hook.authorizationToken.trim()}`;
        }
        const res = await fetch(hook.url, {
          method: "POST",
          headers,
          body: JSON.stringify(envelope),
          cache: "no-store",
        });
        const body = await res.text().catch(() => "");
        if (!res.ok) {
          failed += 1;
          await logWebhookDelivery({
            webhookId: hook.id,
            incomingEventId: params.incomingEventId ?? null,
            status: "error",
            statusCode: res.status,
            responseBody: shortText(body || `HTTP ${res.status}`),
            error: `Non-2xx response from ${hook.url}`,
          });
          return;
        }
        succeeded += 1;
        await logWebhookDelivery({
          webhookId: hook.id,
          incomingEventId: params.incomingEventId ?? null,
          status: "success",
          statusCode: res.status,
          responseBody: shortText(body),
        });
      } catch (error) {
        failed += 1;
        await logWebhookDelivery({
          webhookId: hook.id,
          incomingEventId: params.incomingEventId ?? null,
          status: "error",
          error:
            error instanceof Error
              ? shortText(error.message)
              : "Unknown webhook delivery error",
        });
      }
    }),
  );

  return { attempted: hooks.length, succeeded, failed };
}

export async function listOutgoingWebhooksAdmin() {
  return db
    .select()
    .from(outgoingWebhooks)
    .orderBy(desc(outgoingWebhooks.id));
}

export async function getIncomingEventsAdmin(limit = 50) {
  const capped = Math.max(1, Math.min(100, limit));
  return db
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
    })
    .from(incomingEvents)
    .orderBy(desc(incomingEvents.receivedAt))
    .limit(capped);
}

export async function getWebhookDeliverySummaryAdmin() {
  const rows = await db
    .select({
      id: outgoingWebhookDeliveries.id,
      webhookId: outgoingWebhookDeliveries.webhookId,
      incomingEventId: outgoingWebhookDeliveries.incomingEventId,
      status: outgoingWebhookDeliveries.status,
      statusCode: outgoingWebhookDeliveries.statusCode,
      deliveredAt: outgoingWebhookDeliveries.deliveredAt,
    })
    .from(outgoingWebhookDeliveries)
    .orderBy(desc(outgoingWebhookDeliveries.deliveredAt))
    .limit(300);
  return rows;
}

export async function toggleOutgoingWebhookEnabled(
  webhookId: number,
  enabled: boolean,
) {
  const rows = await db
    .update(outgoingWebhooks)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(outgoingWebhooks.id, webhookId))
    .returning();
  return rows[0] ?? null;
}

export async function createOutgoingWebhookAdmin(input: {
  name: string;
  url: string;
  authorizationToken?: string | null;
  enabled?: boolean;
}) {
  const rows = await db
    .insert(outgoingWebhooks)
    .values({
      name: input.name,
      url: input.url,
      authorizationToken: input.authorizationToken ?? null,
      enabled: input.enabled !== false,
    })
    .returning();
  return rows[0] ?? null;
}

export async function updateOutgoingWebhookAdmin(
  webhookId: number,
  input: {
    name?: string;
    url?: string;
    authorizationToken?: string | null;
    enabled?: boolean;
  },
) {
  const patch: {
    name?: string;
    url?: string;
    authorizationToken?: string | null;
    enabled?: boolean;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (typeof input.name === "string") patch.name = input.name;
  if (typeof input.url === "string") patch.url = input.url;
  if (input.authorizationToken !== undefined) {
    patch.authorizationToken = input.authorizationToken;
  }
  if (typeof input.enabled === "boolean") patch.enabled = input.enabled;

  const rows = await db
    .update(outgoingWebhooks)
    .set(patch)
    .where(eq(outgoingWebhooks.id, webhookId))
    .returning();
  return rows[0] ?? null;
}

export async function deleteOutgoingWebhookAdmin(webhookId: number) {
  const rows = await db
    .delete(outgoingWebhooks)
    .where(eq(outgoingWebhooks.id, webhookId))
    .returning({ id: outgoingWebhooks.id });
  return rows.length > 0;
}

export async function getOutgoingWebhookByUrl(url: string) {
  const rows = await db
    .select()
    .from(outgoingWebhooks)
    .where(and(eq(outgoingWebhooks.url, url)));
  return rows[0] ?? null;
}
