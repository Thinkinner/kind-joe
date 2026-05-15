import { GoogleGenAI, Type, type Schema } from "@google/genai";
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
  | "socialCopy"
  | "predictionSuggestion"
  | "humanComment";

const ARTICLE_ALL_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    slug: { type: Type.STRING },
    category: { type: Type.STRING },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    excerpt: { type: Type.STRING },
    draftHtml: { type: Type.STRING },
    seoDescription: { type: Type.STRING },
  },
  required: ["title", "slug", "category", "tags", "excerpt", "draftHtml"],
};

const PREDICTION_SUGGESTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestionType: { type: Type.STRING },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    category: { type: Type.STRING },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    rationale: { type: Type.STRING },
  },
  required: [
    "suggestionType",
    "title",
    "description",
    "category",
    "options",
    "rationale",
  ],
};

const HUMAN_COMMENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    comment: { type: Type.STRING },
    persona: { type: Type.STRING },
    emotion: { type: Type.STRING },
    engagementIntent: { type: Type.STRING },
  },
  required: ["comment", "persona", "emotion", "engagementIntent"],
};

const SLUG_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { slug: { type: Type.STRING } },
  required: ["slug"],
};

const CATEGORY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { category: { type: Type.STRING } },
  required: ["category"],
};

const TAGS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["tags"],
};

const EXCERPT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { excerpt: { type: Type.STRING } },
  required: ["excerpt"],
};

const SEO_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    seoTitle: { type: Type.STRING },
    seoDescription: { type: Type.STRING },
    seoScore: { type: Type.NUMBER },
    seoFeedback: { type: Type.STRING },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["seoTitle", "seoDescription"],
};

const CONTENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { draftHtml: { type: Type.STRING } },
  required: ["draftHtml"],
};

const TITLE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { title: { type: Type.STRING } },
  required: ["title"],
};

const SOCIAL_COPY_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    headlines: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    tightHeadline: { type: Type.STRING },
    caption: { type: Type.STRING },
  },
  required: ["headlines", "tightHeadline", "caption"],
};

function schemaForMode(mode: AssistMode): Schema {
  switch (mode) {
    case "predictionSuggestion":
      return PREDICTION_SUGGESTION_SCHEMA;
    case "humanComment":
      return HUMAN_COMMENT_SCHEMA;
    case "slug":
      return SLUG_SCHEMA;
    case "category":
      return CATEGORY_SCHEMA;
    case "tags":
      return TAGS_SCHEMA;
    case "excerpt":
      return EXCERPT_SCHEMA;
    case "seo":
      return SEO_SCHEMA;
    case "content":
      return CONTENT_SCHEMA;
    case "title":
      return TITLE_SCHEMA;
    case "socialCopy":
      return SOCIAL_COPY_SCHEMA;
    case "all":
    default:
      return ARTICLE_ALL_SCHEMA;
  }
}

const INPUT_LIMITS: Record<AssistMode, number> = {
  all: 7000,
  slug: 700,
  category: 1200,
  tags: 1600,
  excerpt: 1800,
  seo: 2600,
  content: 3000,
  title: 900,
  socialCopy: 2200,
  predictionSuggestion: 1600,
  humanComment: 1800,
};

const MAX_OUTPUT_TOKENS: Record<AssistMode, number> = {
  all: 1800,
  slug: 120,
  category: 120,
  tags: 220,
  excerpt: 220,
  seo: 380,
  content: 1100,
  title: 120,
  socialCopy: 420,
  predictionSuggestion: 260,
  humanComment: 220,
};

const ASSIST_FETCH_USER_AGENT =
  "Mozilla/5.0 (compatible; KindJoeArticleAssistant/1.0)";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isAssistMode(value: unknown): value is AssistMode {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(INPUT_LIMITS, value)
  );
}

function isLoopbackOrPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower === "127.0.0.1" || lower === "::1") return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(lower)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(lower)) return true;
  return false;
}

function maybeParseSourceUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    if (isLoopbackOrPrivateHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractTitleFromHtml(html: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return stripHtml(match[1] || "").slice(0, 220);
}

function extractMainTextFromHtml(html: string): string {
  const withoutNoise = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const articleMatch = withoutNoise.match(
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
  );
  const bodyMatch = withoutNoise.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const candidate = articleMatch?.[1] ?? bodyMatch?.[1] ?? withoutNoise;

  const cleaned = stripHtml(candidate);
  if (cleaned.length >= 500) return cleaned;
  return stripHtml(withoutNoise);
}

async function fetchArticleFromUrl(url: URL): Promise<{
  content: string;
  sourceTitle: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "User-Agent": ASSIST_FETCH_USER_AGENT,
      },
    });

    if (!upstream.ok) {
      throw new Error(`Upstream responded with ${upstream.status}`);
    }

    const html = await upstream.text();
    const sourceTitle = extractTitleFromHtml(html);
    const content = extractMainTextFromHtml(html);
    if (!content.trim()) {
      throw new Error("Fetched page had no readable content");
    }
    return { content, sourceTitle };
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveAssistInput(rawInput: string): Promise<{
  content: string;
  sourceUrl: string;
  sourceTitle: string;
  wasScraped: boolean;
}> {
  const parsedUrl = maybeParseSourceUrl(rawInput);
  if (!parsedUrl) {
    return {
      content: rawInput,
      sourceUrl: "",
      sourceTitle: "",
      wasScraped: false,
    };
  }

  try {
    const fetched = await fetchArticleFromUrl(parsedUrl);
    return {
      content: fetched.content,
      sourceUrl: parsedUrl.toString(),
      sourceTitle: fetched.sourceTitle,
      wasScraped: true,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown fetch error";
    console.warn("article-assist: source url fetch failed", {
      sourceUrl: parsedUrl.toString(),
      reason,
    });
    return {
      content: rawInput,
      sourceUrl: parsedUrl.toString(),
      sourceTitle: "",
      wasScraped: false,
    };
  }
}

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
  const normalized = input
    .replace(/<h[1-6]\b[^>]*>/gi, "<p>")
    .replace(/<\/h[1-6]>/gi, "</p>");
  const hasHtmlTag = /<[^>]+>/.test(normalized);
  if (hasHtmlTag) return normalized;

  // Fallback: if model returned plain text, convert paragraph breaks to simple HTML paragraphs.
  return normalized
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p>${chunk}</p>`)
    .join("");
}

function sanitizeCommentDraft(raw: string): string {
  const text = String(raw ?? "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.slice(0, 260);
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function computeHumanCommentDelaySeconds(sourceTextLength: number): number {
  const isLongRead = sourceTextLength >= 3200;
  const roll = Math.random();

  if (isLongRead) {
    if (roll < 0.2) return randomIntInclusive(10 * 60, 28 * 60);
    if (roll < 0.7) return randomIntInclusive(30 * 60, 110 * 60);
    return randomIntInclusive(120 * 60, 5 * 60 * 60);
  }

  if (roll < 0.35) return randomIntInclusive(6 * 60, 20 * 60);
  if (roll < 0.82) return randomIntInclusive(22 * 60, 85 * 60);
  return randomIntInclusive(90 * 60, 4 * 60 * 60);
}

function formatDelayLabel(totalSeconds: number): string {
  if (totalSeconds < 3600) {
    const minutes = Math.max(1, Math.round(totalSeconds / 60));
    return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = totalSeconds / 3600;
  if (hours < 2) {
    return `about ${Math.round(hours * 10) / 10} hours`;
  }
  const roundedHours = Math.round(hours);
  return `about ${roundedHours} hours`;
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
    const body = (await req.json()) as Record<string, unknown>;
    const title = body.title;
    const html = body.html;
    const blocks = body.blocks;
    const inspectOnly = body.inspectOnly === true;
    const customPrompt = String(body.customPrompt ?? "");
    const mode = isAssistMode(body.mode) ? body.mode : "all";

    const resolvedInput = await resolveAssistInput(String(html ?? ""));
    if (inspectOnly) {
      return NextResponse.json({
        inspectOnly: true,
        scraped: resolvedInput.wasScraped,
        sourceUrl: resolvedInput.sourceUrl,
        sourceTitle: resolvedInput.sourceTitle,
        previewText: summarizeForMode(stripHtml(resolvedInput.content), 1200),
        charCount: resolvedInput.content.length,
      });
    }

    const rawHtml = resolvedInput.content;
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
        : mode === "humanComment"
          ? [
              "Generate one human-like article comment as if from a normal reader.",
              "Return JSON only with: comment, persona, emotion, engagementIntent.",
              "comment must be 1-3 short sentences and <= 240 characters.",
              "Sound natural, specific, and conversational; avoid robotic wording.",
              "Reference one concrete point from the input article summary.",
              "Do not use hashtags, promotional language, or CTA marketing phrases.",
              "Do not claim firsthand events you cannot know; keep it as reader feedback/opinion.",
              "persona should be one of: curious-reader, thoughtful-analyst, supportive-local, skeptical-observer, practical-voice.",
              "emotion should be one of: curious, hopeful, concerned, skeptical, impressed, mixed.",
              "engagementIntent should be one of: ask-question, share-reaction, add-context, cautious-take, encourage-discussion.",
            ].join("\n")
          : mode === "socialCopy"
            ? [
                "Return JSON only with keys: headlines, tightHeadline, caption.",
                "headlines must contain exactly 5 different short news-style headline options.",
                "Keep each headline neutral, factual, concise, and non-sensational.",
                "Avoid exaggeration, speculation, and emotionally loaded language.",
                "Use clear attribution when needed (e.g., allegedly, reports say, officials say).",
                "1-2 relevant emojis at the start are optional, but preferred when natural.",
                "tightHeadline must be the shortest accurate version.",
                "caption must start as one short teasing sentence and include the exact phrase: Details in bio.",
                "After that sentence, include a horizontal divider line: ---",
                "Then include this exact bold CTA line:",
                "**Comment JOE to follow updates on this story and join our uncensored newsletter recap, always free.**",
              ].join("\n")
        : mode === "all"
          ? [
              "When returning draftHtml, generate substantial original article content suitable for publication quality.",
              "draftHtml must be at least 600 words; target 650-900 words for stronger depth.",
              "Use short paragraphs: 1-2 sentences per paragraph only.",
              "Write in a natural newsroom voice as one coherent article with a strong lead, contextual body, and clear close.",
              "Cover: what happened, why it matters, what could happen next, and reader/local impact within the body flow.",
              "Include at least 2 direct quotes with clear attribution when source material supports it.",
              "Include at least 3 in-body attribution cues such as 'according to', 'reported by', or named official statements.",
              "Include one short paragraph that fairly presents a skeptical or opposing perspective.",
              "Do not output template labels like 'Hook:', 'Quick recap:', 'Your analysis:', 'Local/reader impact:', or 'Actionable takeaway:'.",
              "Do not output bullet-point sections unless specifically required by the prompt.",
              "Sources must include attribution language (for example: 'Source: Reuters ...', 'Source: official statement ...', 'Source: X post ...').",
              "End with a short source attribution paragraph in natural prose.",
              "Do not include headings/subheadings tags; use paragraph-only HTML.",
              "Return clean HTML in draftHtml only (no markdown).",
            ].join("\n")
          : mode === "content"
            ? [
                "When returning draftHtml, prefer short paragraphs (1-2 sentences each).",
                "When expanding an article, preserve natural newsroom flow and improve depth, clarity, and context.",
                "If structure is weak, rewrite toward: strong lead, factual context, implications, and closing takeaway.",
                "Ensure the full draft reaches these publish checks: 2+ direct quotes, 3+ in-body attribution cues, and one opposing-view paragraph.",
                "Avoid rigid templates and avoid labels like 'Hook:' or 'Quick recap:'.",
                "Keep sources clearly attributed (Fox/X links or references).",
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
            sourceUrl: resolvedInput.sourceUrl,
            sourceTitle: resolvedInput.sourceTitle,
            mode,
          })
        : mode === "socialCopy"
          ? JSON.stringify({
              title: String(title ?? "").slice(0, 220),
              summary: safeText,
              sourceUrl: resolvedInput.sourceUrl,
              sourceTitle: resolvedInput.sourceTitle,
              mode,
            })
        : mode === "humanComment"
          ? JSON.stringify({
              title: String(title ?? "").slice(0, 220),
              summary: safeText,
              sourceUrl: resolvedInput.sourceUrl,
              sourceTitle: resolvedInput.sourceTitle,
              mode,
            })
        : JSON.stringify({
            title: String(title ?? "").slice(0, 260),
            html: safeHtml,
            sourceUrl: resolvedInput.sourceUrl,
            sourceTitle: resolvedInput.sourceTitle,
            blocks,
            mode,
          });

    const ai = new GoogleGenAI({ apiKey });
    const requestContents = `${system}\n\nINPUT:\n${userPayload}`;
    const responseSchema = schemaForMode(mode);

    const runModel = async (contents: string) =>
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1,
          maxOutputTokens: MAX_OUTPUT_TOKENS[mode],
        },
      });

    const response = await runModel(requestContents);
    let raw = response.text?.trim() || "{}";
    let data: Record<string, unknown>;
    try {
      data = parseGeneratedJson<Record<string, unknown>>(raw);
    } catch {
      const retryResponse = await runModel(
        `${requestContents}\n\nIMPORTANT: Return valid JSON only. No markdown, code fences, or commentary.`,
      );
      raw = retryResponse.text?.trim() || "{}";
      data = parseGeneratedJson<Record<string, unknown>>(raw);
    }
    const commentDelaySeconds =
      mode === "humanComment"
        ? computeHumanCommentDelaySeconds(safeText.length)
        : undefined;

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
      socialHeadlines: Array.isArray(data.headlines)
        ? data.headlines.map(String).slice(0, 5)
        : [],
      socialTightHeadline: String(data.tightHeadline ?? ""),
      socialCaption: String(data.caption ?? ""),
      commentDraft: sanitizeCommentDraft(String(data.comment ?? "")),
      commentPersona: String(data.persona ?? ""),
      commentEmotion: String(data.emotion ?? ""),
      commentIntent: String(data.engagementIntent ?? ""),
      commentDelaySeconds,
      commentDelayLabel:
        typeof commentDelaySeconds === "number"
          ? formatDelayLabel(commentDelaySeconds)
          : "",
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("article-assist:", err);
    const message = err instanceof Error ? err.message : "Assist failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
