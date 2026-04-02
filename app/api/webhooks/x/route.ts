import { NextResponse } from "next/server";
import { z } from "zod";
import { processIntelRaw } from "@/lib/aggregator/factory";

export const maxDuration = 120;

const trustTierSchema = z.enum(["low", "medium", "high"]);

const directXPayloadSchema = z.object({
  id: z.string().min(1).max(2048),
  text: z.string().min(1).max(200_000),
  source: z.string().optional(),
  url: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  createdAt: z.union([z.string(), z.number()]).optional(),
  enriched: z
    .object({
      canonicalSourceUrl: z.string().optional().nullable(),
      sourceDisplayName: z.string().optional().nullable(),
      sourceHandle: z.string().optional().nullable(),
      sourceIconKey: z.string().optional().nullable(),
      sourceAvatarUrl: z.string().optional().nullable(),
      sourceVerified: z.boolean().optional().nullable(),
      trustTier: trustTierSchema.optional().nullable(),
      trustScore: z.number().optional().nullable(),
      mediaUrls: z.array(z.string()).optional().nullable(),
    })
    .partial()
    .optional(),
});

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const handle = value.trim().replace(/^@+/, "");
  if (!handle) return null;
  return `@${handle}`;
}

async function ingestDirectPayload(raw: unknown) {
  const parsed = directXPayloadSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, status: 400, body: { error: "Invalid X payload", details: parsed.error.flatten() } };

  const data = parsed.data;
  const sourceUrl =
    asHttpUrl(data.sourceUrl) ??
    asHttpUrl(data.twitterUrl) ??
    asHttpUrl(data.url) ??
    asHttpUrl(data.enriched?.canonicalSourceUrl) ??
    null;

  const timestamp =
    asDate(data.timestamp) ??
    asDate(data.createdAt) ??
    undefined;

  await processIntelRaw({
    id: data.id,
    text: data.text,
    source: "X",
    sourceUrl,
    timestamp,
    enriched: {
      canonicalSourceUrl: asHttpUrl(data.enriched?.canonicalSourceUrl) ?? sourceUrl,
      sourceDisplayName: data.enriched?.sourceDisplayName ?? null,
      sourceHandle: asHandle(data.enriched?.sourceHandle) ?? null,
      sourceIconKey: data.enriched?.sourceIconKey ?? "x",
      sourceAvatarUrl: asHttpUrl(data.enriched?.sourceAvatarUrl),
      sourceVerified: Boolean(data.enriched?.sourceVerified),
      trustTier: data.enriched?.trustTier ?? undefined,
      trustScore: data.enriched?.trustScore ?? undefined,
      mediaUrls:
        data.enriched?.mediaUrls
          ?.map((u) => asHttpUrl(u))
          .filter((u): u is string => Boolean(u)) ?? undefined,
    },
  });

  return { ok: true as const, status: 200, body: { ok: true, processed: 1, mode: "direct" } };
}

export async function POST(req: Request) {
  try {
    const secret = process.env.X_WEBHOOK_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const rawPayload: unknown = await req.json();
    const direct = await ingestDirectPayload(rawPayload);
    return NextResponse.json(direct.body, { status: direct.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
