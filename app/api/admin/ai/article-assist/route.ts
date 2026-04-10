import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveStaffApi } from "@/lib/auth/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type AssistMode =
  | "all"
  | "slug"
  | "category"
  | "tags"
  | "excerpt"
  | "seo"
  | "content"
  | "title";

export async function POST(req: Request) {
  const staff = await resolveStaffApi(PERMISSIONS.ADMIN_ARTICLE_ASSISTANT);
  if (!staff.ok) {
    return NextResponse.json(
      { error: staff.reason },
      { status: staff.reason === "unauthenticated" ? 401 : 403 },
    );
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_API_KEY is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const {
      title = "",
      html = "",
      blocks,
      mode = "all" as AssistMode,
      customPrompt = "",
    } = body;

    const safeHtml = String(html).slice(0, 8000);

    const system = [
      "You are an SEO assistant for a news/blog CMS.",
      "Return JSON matching the schema only.",
      "Be neutral and factual; do not invent concrete statistics.",
      "Tags: lowercase kebab-case, specific, 5–12 items unless mode says otherwise.",
      `Mode: ${mode}.`,
      customPrompt ? `Extra instructions: ${customPrompt}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const userPayload = JSON.stringify({
      title,
      html: safeHtml,
      blocks,
      mode,
    });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `${system}\n\nINPUT:\n${userPayload}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const raw = response.text?.trim() || "{}";
    const data = JSON.parse(raw) as Record<string, unknown>;

    const result = {
      slug: String(data.slug ?? ""),
      category: String(data.category ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      excerpt: String(data.excerpt ?? ""),
      seoTitle: String(data.seoTitle ?? ""),
      seoDescription: String(data.seoDescription ?? ""),
      suggestedCoverPrompt: String(data.suggestedCoverPrompt ?? ""),
      readingMinutes:
        typeof data.readingMinutes === "number" ? data.readingMinutes : undefined,
      draftHtml: String(data.draftHtml ?? ""),
      draftBlocks: data.draftBlocks,
      title: String(data.title ?? ""),
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("article-assist:", err);
    const message = err instanceof Error ? err.message : "Assist failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
