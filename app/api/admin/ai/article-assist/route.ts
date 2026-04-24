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
  | "title"
  | "predictionSuggestion";

const INPUT_LIMITS: Record<AssistMode, number> = {
  all: 7000,
  slug: 700,
  category: 1200,
  tags: 1600,
  excerpt: 1800,
  seo: 2600,
  content: 3000,
  title: 900,
  predictionSuggestion: 1600,
};

const MAX_OUTPUT_TOKENS: Record<AssistMode, number> = {
  all: 1200,
  slug: 120,
  category: 120,
  tags: 220,
  excerpt: 220,
  seo: 380,
  content: 700,
  title: 120,
  predictionSuggestion: 260,
};

function stripHtml(input: string): string {
  return input
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeForMode(input: string, maxChars: number): string {
  if (!input) return "";
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars);
}

function sanitizeDraftHtml(raw: string): string {
  const input = raw.trim();
  if (!input) return "";
  // Convert heading tags into normal paragraph tags so generated drafts stay paragraph-first.
  return input
    .replace(/<h[1-6]\b[^>]*>/gi, "<p>")
    .replace(/<\/h[1-6]>/gi, "</p>");
}

function cleanJson(text: string): string {
  if (!text) return "{}";
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || start >= end) return cleaned.trim();
  return cleaned.slice(start, end + 1).trim();
}

function extractBalancedJsonObject(text: string): string | null {
  const source = (text || "").trim();
  if (!source) return null;

  const start = source.indexOf("{");
  if (start < 0) return null;

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

function parseGeneratedJson<T>(rawText: string): T {
  const candidates = [
    rawText,
    cleanJson(rawText),
    extractBalancedJsonObject(rawText),
    extractBalancedJsonObject(cleanJson(rawText)),
  ].filter((value): value is string => Boolean(value && value.trim()));

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("AI returned malformed data. Please try again.");
}

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

    const rawHtml = String(html ?? "");
    const safeHtml = summarizeForMode(rawHtml, INPUT_LIMITS[mode]);
    const safeText = summarizeForMode(stripHtml(rawHtml), INPUT_LIMITS[mode]);

    const modeGuidance =
      mode === "predictionSuggestion"
        ? [
            "Generate one concise high-engagement prediction or poll idea from the article topic.",
            "Return JSON only with: suggestionType, title, description, category, options, rationale.",
            "suggestionType must be either 'prediction' or 'poll'.",
            "options must be 2-6 short options suitable for voting.",
            "Prefer 3-5 nuanced options; avoid default yes/no unless truly binary.",
            "If the topic is discussion-oriented, write an engaging audience question instead of a strict forecast.",
            "category should map to one of: general, politics, economy, technology, science, sports, world, culture.",
            "Keep description and rationale brief (1-2 sentences each).",
          ].join("\n")
        : mode === "all"
          ? [
              "When returning draftHtml, generate substantial original article content suitable for publication quality.",
              "Target around 350 words of body content in draftHtml (roughly 320-380 words).",
              "Use short paragraphs: 1-2 sentences per paragraph only.",
              "Do not include headings or subheadings inside draftHtml.",
              "Do not include section title lines like 'Future Outlook and Next Steps'.",
              "Return clean HTML in draftHtml only (no markdown).",
            ].join("\n")
          : mode === "content"
            ? [
                "When returning draftHtml, prefer short paragraphs (1-2 sentences each).",
                "Do not include headings or subheadings inside draftHtml.",
                "Keep additions editorially useful, concise, and readable.",
                "Return clean HTML in draftHtml only (no markdown).",
              ].join("\n")
            : "";

    const system = [
      "You are an SEO assistant for a news/blog CMS.",
      "Return JSON matching the schema only.",
      "Be neutral and factual; do not invent concrete statistics.",
      "Tags: lowercase kebab-case, specific, 5–12 items unless mode says otherwise.",
      `Mode: ${mode}.`,
      modeGuidance,
      customPrompt ? `Extra instructions: ${customPrompt}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const userPayload =
      mode === "predictionSuggestion"
        ? JSON.stringify({
            title: String(title ?? "").slice(0, 220),
            summary: safeText,
            mode,
          })
        : JSON.stringify({
            title: String(title ?? "").slice(0, 260),
            html: safeHtml,
            blocks,
            mode,
          });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${system}\n\nINPUT:\n${userPayload}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: MAX_OUTPUT_TOKENS[mode],
      },
    });

    const raw = response.text?.trim() || "{}";
    const data = parseGeneratedJson<Record<string, unknown>>(raw);

    const result = {
      slug: String(data.slug ?? ""),
      category: String(data.category ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      excerpt: String(data.excerpt ?? ""),
      suggestionType:
        data.suggestionType === "poll" || data.suggestionType === "prediction"
          ? data.suggestionType
          : "",
      options: Array.isArray(data.options) ? data.options.map(String) : [],
      rationale: String(data.rationale ?? ""),
      seoScore:
        typeof data.seoScore === "number" ? data.seoScore : undefined,
      seoFeedback: String(data.seoFeedback ?? ""),
      tone: String(data.tone ?? ""),
      bias: String(data.bias ?? ""),
      suggestions: Array.isArray(data.suggestions)
        ? data.suggestions.map(String)
        : [],
      seoTitle: String(data.seoTitle ?? ""),
      seoDescription: String(data.seoDescription ?? ""),
      suggestedCoverPrompt: String(data.suggestedCoverPrompt ?? ""),
      readingMinutes:
        typeof data.readingMinutes === "number" ? data.readingMinutes : undefined,
      draftHtml: sanitizeDraftHtml(String(data.draftHtml ?? "")),
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
