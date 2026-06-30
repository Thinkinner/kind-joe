import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import type { SourceFirstPacket } from "@/lib/ai/source-first-research";

const ARTICLE_ALL_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    slug: { type: Type.STRING },
    category: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    excerpt: { type: Type.STRING },
    draftMarkdown: { type: Type.STRING },
    seoDescription: { type: Type.STRING },
  },
  required: ["title", "slug", "category", "tags", "excerpt", "draftMarkdown"],
};

const SOURCE_FIRST_METADATA_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    slug: { type: Type.STRING },
    category: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    excerpt: { type: Type.STRING },
    seoDescription: { type: Type.STRING },
  },
  required: ["title", "slug", "category", "tags", "excerpt", "seoDescription"],
};

const INPUT_LIMIT_ALL = 7000;
const SOURCE_FIRST_INPUT_LIMIT = 24000;
/** Full-article JSON needs headroom; 1800 truncates mid-JSON on gemini-3.5-flash. */
const MAX_OUTPUT_TOKENS_ALL = 8192;
/** CMS article assistant + RSS auto-writer (override via GEMINI_ARTICLE_ASSIST_MODEL). */
export const ARTICLE_ASSIST_MODEL =
  process.env.GEMINI_ARTICLE_ASSIST_MODEL?.trim() || "gemini-3.5-flash";

/** Gemini 3.5+ ignores temperature; omit it to match API guidance. */
function articleAssistGenerateConfig(options: {
  responseSchema: Schema;
  maxOutputTokens: number;
}): {
  responseMimeType: "application/json";
  responseSchema: Schema;
  maxOutputTokens: number;
} {
  return {
    responseMimeType: "application/json",
    responseSchema: options.responseSchema,
    maxOutputTokens: options.maxOutputTokens,
  };
}

function articleAssistTextGenerateConfig(options: { maxOutputTokens: number }): {
  maxOutputTokens: number;
} {
  return {
    maxOutputTokens: options.maxOutputTokens,
  };
}

function normalizeTagValue(tag: string): string {
  return String(tag)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function summarizeForMode(input: string, maxChars: number): string {
  if (!input) return "";
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function cleanGeneratedMarkdown(text: string): string {
  return text
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function titleFromMarkdown(markdown: string): string {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 160);

  const firstLine = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return (firstLine || "Source-first article").replace(/^#+\s*/, "").slice(0, 160);
}

function excerptFromMarkdown(markdown: string): string {
  const text = markdown
    .replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/[#*_>`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 220);
}

function countMarkdownLinks(markdown: string): number {
  return Array.from(markdown.matchAll(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g)).length;
}

function buildFallbackSourceFirstMarkdown(input: {
  query: string;
  sources: SourceFirstPacket[];
}): string {
  const headline = input.sources[0]?.title || titleFromMarkdown(input.query);
  const primary = input.sources[0];
  const otherSources = input.sources.slice(1);
  const sourceLinks = input.sources
    .map((source) => `[${source.publisher || source.title}](${source.url})`)
    .join(", ");

  return [
    `# ${headline}`,
    "",
    primary
      ? `${primary.snippet || primary.extractedText} [${primary.publisher || "Source"}](${primary.url}).`
      : "This draft is based only on the source packets available to the assistant.",
    "",
    "## What Happened",
    "",
    primary
      ? `${primary.extractedText || primary.snippet} [Read the source](${primary.url}).`
      : "The available sources do not provide enough detail for a full article.",
    "",
    ...otherSources.flatMap((source) => [
      `${source.snippet || source.extractedText} [${source.publisher || "Source"}](${source.url}).`,
      "",
    ]),
    "## Why It Matters",
    "",
    "This story matters only to the extent supported by the sources above. Editors should review the source packets and strengthen this section with confirmed context before publishing.",
    "",
    "## What Happens Next",
    "",
    "Watch for updated reporting from the same publishers and direct statements from the people or institutions named in the source articles.",
    "",
    "## What We Still Don't Know",
    "",
    "- Which details have been independently confirmed by more than one direct source.",
    "- Whether newer reporting changes the timeline or context.",
    "- What official response, if any, follows from the named parties.",
    "",
    `Source note: This draft is based on reporting and source summaries from ${sourceLinks}.`,
  ].join("\n");
}

function normalizedUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return url.trim().replace(/\/+$/, "");
  }
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function keepOnlyVerifiedSourceLinks(
  markdown: string,
  sources: SourceFirstPacket[],
): string {
  const allowedUrls = new Map<string, string>();
  const sourceUrlByHost = new Map<string, string>();

  for (const source of sources) {
    const url = source.url.trim();
    if (!url) continue;
    allowedUrls.set(normalizedUrlKey(url), url);
    const host = hostFromUrl(url);
    if (host && !sourceUrlByHost.has(host)) sourceUrlByHost.set(host, url);
  }

  return markdown.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (match, label, url) => {
    const verifiedUrl = allowedUrls.get(normalizedUrlKey(String(url)));
    if (verifiedUrl) return `[${label}](${verifiedUrl})`;

    const sameHostSourceUrl = sourceUrlByHost.get(hostFromUrl(String(url)));
    if (sameHostSourceUrl) return `[${label}](${sameHostSourceUrl})`;

    return String(label);
  });
}

function stripHtml(input: string): string {
  return input
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      // Try next candidate.
    }
  }

  const trimmed = (rawText || "").trim();
  const likelyTruncated =
    trimmed.length > 0 &&
    trimmed.startsWith("{") &&
    !trimmed.endsWith("}") &&
    extractBalancedJsonObject(trimmed) == null;
  throw new Error(
    likelyTruncated
      ? "AI response was cut off (output too long). Please try again."
      : "AI returned malformed data. Please try again.",
  );
}

function buildMinimumTags(input: {
  title: string;
  category: string;
  sourceText: string;
  existing: string[];
  minCount?: number;
}): string[] {
  const minCount = input.minCount ?? 12;
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (value: string) => {
    const normalized = normalizeTagValue(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  for (const tag of input.existing) push(tag);

  const titleTokens = String(input.title)
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .slice(0, 8);
  for (const token of titleTokens) push(token);

  push(String(input.category || "general"));

  const sourceTokens = String(input.sourceText)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5)
    .slice(0, 20);
  for (const token of sourceTokens) {
    if (out.length >= minCount) break;
    push(token);
  }

  const fallbackPool = [
    "breaking-news",
    "latest-updates",
    "public-interest",
    "accountability",
    "news-analysis",
    "community-impact",
    "policy-watch",
    "local-news",
    "national-news",
    "fact-check",
    "developing-story",
    "reader-update",
    "current-events",
    "investigation",
    "editorial-coverage",
    "newsroom-report",
  ];
  for (const candidate of fallbackPool) {
    if (out.length >= minCount) break;
    push(candidate);
  }

  return out;
}

export type ArticleAssistAllOutput = {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  excerpt: string;
  draftMarkdown: string;
  seoDescription: string;
};

export async function generateArticleAssistAll(input: {
  html: string;
  title?: string;
  blocks?: unknown;
  sourceUrl?: string;
  sourceTitle?: string;
  customPrompt?: string;
  model?: string;
}): Promise<ArticleAssistAllOutput> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");

  const customPrompt = String(input.customPrompt ?? "");
  const usesCustomDraftPrompt = customPrompt.trim().length > 0;
  const safeHtml = summarizeForMode(String(input.html ?? ""), INPUT_LIMIT_ALL);
  const safeText = summarizeForMode(stripHtml(safeHtml), INPUT_LIMIT_ALL);

  const modeGuidance = usesCustomDraftPrompt
    ? ""
    : [
        "When returning draftMarkdown, generate substantial original article content suitable for publication quality.",
        "draftMarkdown must be at least 600 words; target 650-900 words for stronger depth.",
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
        "Return markdown in draftMarkdown only.",
      ].join("\n");

  const system = [
    "You are an SEO assistant for a news/blog CMS.",
    "Return JSON matching the schema only.",
    "Be neutral and factual; do not invent concrete statistics.",
    "Tags: lowercase kebab-case, specific, 5–12 items unless mode says otherwise.",
    "Mode: all.",
    modeGuidance,
    customPrompt ? `Extra instructions: ${customPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPayload = JSON.stringify({
    title: String(input.title ?? "").slice(0, 260),
    html: safeHtml,
    sourceUrl: String(input.sourceUrl ?? ""),
    sourceTitle: String(input.sourceTitle ?? ""),
    blocks: input.blocks,
    mode: "all",
  });

  const requestContents = `${system}\n\nINPUT:\n${userPayload}`;
  const ai = new GoogleGenAI({ apiKey });

  const runModel = async (contents: string) =>
    ai.models.generateContent({
      model: input.model || ARTICLE_ASSIST_MODEL,
      contents,
      config: articleAssistGenerateConfig({
        responseSchema: ARTICLE_ALL_SCHEMA,
        maxOutputTokens: MAX_OUTPUT_TOKENS_ALL,
      }),
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

  const title = String(data.title ?? "");
  const category = String(data.category ?? "");
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const rawDraftMarkdown = String(data.draftMarkdown ?? "").trim();
  const normalizedMarkdown = normalizeArticleMarkdown(rawDraftMarkdown).trim();

  return {
    title,
    slug: String(data.slug ?? ""),
    category,
    tags: buildMinimumTags({
      title,
      category,
      sourceText: safeText,
      existing: tags,
      minCount: 12,
    }),
    excerpt: String(data.excerpt ?? ""),
    draftMarkdown: normalizedMarkdown,
    seoDescription: String(data.seoDescription ?? ""),
  };
}

export async function generateSourceFirstArticle(input: {
  query: string;
  sources: SourceFirstPacket[];
  model?: string;
}): Promise<ArticleAssistAllOutput> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");

  if (input.sources.length < 2) {
    throw new Error("At least 2 verified sources are required.");
  }

  const sourceText = input.sources
    .map((source) =>
      [
        `Source ID: ${source.id}`,
        `Title: ${source.title}`,
        `Publisher: ${source.publisher}`,
        `URL: ${source.url}`,
        `Snippet: ${source.snippet}`,
        `Extracted text: ${source.extractedText}`,
      ].join("\n"),
    )
    .join("\n\n---\n\n");

  const safeSourceText = summarizeForMode(sourceText, SOURCE_FIRST_INPUT_LIMIT);
  const draftContents = [
    "You are a source-first news writer for Kind Joe.",
    "Write the article body as markdown only. Do not return JSON.",
    "",
    "Hard rules:",
    "- Use ONLY facts found in the source packets.",
    "- Do not invent names, numbers, charges, quotes, dates, agencies, locations, or outcomes.",
    "- If the sources do not answer something, say what is still unknown.",
    "- Every major claim must be tied to an inline markdown link using the source URL.",
    "- Use inline markdown links only with the exact URLs from the source packets.",
    "- Never shorten source URLs to a homepage, section page, tag page, or guessed article URL.",
    "- If unsure which source URL supports a sentence, use attribution text without a link.",
    "- Keep the article concise: 300-450 words and under 3,800 characters.",
    "- Use short paragraphs and plain English.",
    "- Do not include raw source packet IDs in the public article unless useful.",
    "",
    "Structure:",
    "1. Markdown H1 headline.",
    "2. One-sentence subhead.",
    "3. Human lede that explains why the story matters.",
    "4. \"What Happened\" section.",
    "5. Short fact box with source-backed specifics.",
    "6. \"Why It Matters\" section.",
    "7. \"What Happens Next\" section.",
    "8. \"What We Still Don't Know\" section with 3 questions.",
    "9. Final source note naming publishers used.",
    "",
    "INPUT:",
    JSON.stringify({
      topic: input.query,
      sources: safeSourceText,
      mode: "source-first-article-markdown",
    }),
  ].join("\n");

  const ai = new GoogleGenAI({ apiKey });
  const runDraftModel = async (contents: string) =>
    ai.models.generateContent({
      model: input.model || ARTICLE_ASSIST_MODEL,
      contents,
      config: articleAssistTextGenerateConfig({
        maxOutputTokens: 4096,
      }),
    });

  let draftResponse = await runDraftModel(draftContents);
  let rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
  let normalizedMarkdown = keepOnlyVerifiedSourceLinks(
    normalizeArticleMarkdown(rawDraftMarkdown).trim(),
    input.sources,
  );

  if (normalizedMarkdown.length < 600 || countMarkdownLinks(normalizedMarkdown) < 1) {
    draftResponse = await runDraftModel(
      [
        draftContents,
        "",
        "IMPORTANT: The previous draft was too short or lacked verified inline links.",
        "Return markdown only.",
        "Write 300-450 words.",
        "Use at least 2 inline markdown links using exact source URLs from the source packets.",
        "Do not return JSON.",
      ].join("\n"),
    );
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = keepOnlyVerifiedSourceLinks(
      normalizeArticleMarkdown(rawDraftMarkdown).trim(),
      input.sources,
    );
  }

  if (
    !normalizedMarkdown ||
    normalizedMarkdown.length < 600 ||
    countMarkdownLinks(normalizedMarkdown) < 1
  ) {
    normalizedMarkdown = keepOnlyVerifiedSourceLinks(
      normalizeArticleMarkdown(
        buildFallbackSourceFirstMarkdown({
          query: input.query,
          sources: input.sources,
        }),
      ).trim(),
      input.sources,
    );
  }
  const fallbackTitle = titleFromMarkdown(normalizedMarkdown);
  const metadataContents = [
    "Return compact JSON metadata for this CMS article.",
    "Do not include the article body.",
    "Tags must be lowercase kebab-case, specific, and 12-20 items.",
    "",
    "INPUT:",
    JSON.stringify({
      topic: input.query,
      fallbackTitle,
      articleMarkdown: summarizeForMode(normalizedMarkdown, 1800),
      sourcePublishers: input.sources.map((source) => source.publisher),
    }),
  ].join("\n");

  const runMetadataModel = async (contents: string) =>
    ai.models.generateContent({
      model: input.model || ARTICLE_ASSIST_MODEL,
      contents,
      config: articleAssistGenerateConfig({
        responseSchema: SOURCE_FIRST_METADATA_SCHEMA,
        maxOutputTokens: 900,
      }),
    });

  const metadataResponse = await runMetadataModel(metadataContents);
  let data: Record<string, unknown>;
  try {
    data = parseGeneratedJson<Record<string, unknown>>(
      metadataResponse.text?.trim() || "{}",
    );
  } catch {
    data = {};
  }

  const title = String(data.title ?? fallbackTitle).trim() || fallbackTitle;
  const category = String(data.category ?? "News").trim() || "News";
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const fallbackExcerpt = excerptFromMarkdown(normalizedMarkdown);

  return {
    title,
    slug: String(data.slug ?? "").trim() || slugify(title),
    category,
    tags: buildMinimumTags({
      title,
      category,
      sourceText: safeSourceText,
      existing: tags,
      minCount: 12,
    }),
    excerpt: String(data.excerpt ?? fallbackExcerpt).trim() || fallbackExcerpt,
    draftMarkdown: normalizedMarkdown,
    seoDescription:
      String(data.seoDescription ?? fallbackExcerpt).trim() || fallbackExcerpt,
  };
}
