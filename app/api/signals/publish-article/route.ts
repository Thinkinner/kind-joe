import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { GeographicScope, Signal } from "@/lib/aggregator/types";
import { publishArticleFromSignal } from "@/lib/signals/publish-signal-article";

function parseGeographicScope(raw: unknown): GeographicScope {
  const v = String(raw ?? "global").toLowerCase().trim();
  if (
    v === "local" ||
    v === "regional" ||
    v === "national" ||
    v === "global"
  ) {
    return v;
  }
  return "global";
}

const geographicScopeSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform(parseGeographicScope);

const adminAreaSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (typeof v === "string" ? v.trim() : ""));

const signalSchema = z.object({
  id: z.string(),
  headline: z.string().min(1).max(500),
  summary: z.string().min(1).max(4000),
  source: z.string(),
  category: z.string(),
  country: z.string(),
  city: z.string(),
  lat: z.number(),
  lng: z.number(),
  impactScore: z.number(),
  timestamp: z.number(),
  tags: z.array(z.string()).optional().default([]),
  geographicScope: geographicScopeSchema.optional().default("global"),
  adminArea: adminAreaSchema.optional().default(""),
});

const bodySchema = z.object({
  signal: signalSchema,
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const s = parsed.data.signal;
    const signal: Signal = {
      id: s.id,
      headline: s.headline,
      summary: s.summary,
      source: s.source as Signal["source"],
      category: s.category as Signal["category"],
      country: s.country,
      city: s.city,
      lat: s.lat,
      lng: s.lng,
      impactScore: s.impactScore,
      timestamp: s.timestamp,
      tags: s.tags,
      geographicScope: s.geographicScope,
      adminArea: s.adminArea,
    };

    const { slug, created } = await publishArticleFromSignal(signal);

    revalidatePath(`/${slug}`);
    revalidatePath("/news");

    return NextResponse.json({ slug, created });
  } catch (e) {
    console.error("publish-article:", e);
    const message =
      e instanceof Error ? e.message : "Could not publish article.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
