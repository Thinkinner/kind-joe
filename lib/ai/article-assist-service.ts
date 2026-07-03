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

function countWords(markdown: string): number {
  return markdown
    .replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, " ")
    .replace(/[#*_>`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

function missingSourceFirstSections(markdown: string): string[] {
  const required = [
    "What Happened",
    "Why It Matters",
    "What Happens Next",
    "What We Still Don't Know",
    "Source Note",
  ];
  const normalized = markdown.toLowerCase();
  return required.filter(
    (section) => !normalized.includes(section.toLowerCase()),
  );
}

function sourceFirstDraftProblem(
  markdown: string,
  options: { minWords?: number; minLinks?: number } = {},
): string | null {
  const minWords = options.minWords ?? 500;
  const minLinks = options.minLinks ?? 2;
  if (!markdown.trim()) return "empty draft";
  const words = countWords(markdown);
  if (words < minWords) return `too short (${words} words)`;
  if (countMarkdownLinks(markdown) < minLinks) return "missing verified inline links";
  const missingSections = missingSourceFirstSections(markdown);
  if (missingSections.length > 0) {
    return `missing sections: ${missingSections.join(", ")}`;
  }
  if (!/source note/i.test(markdown)) return "missing source note";
  return null;
}

function missingEditorialSections(markdown: string): string[] {
  const required = [
    "Why It Matters",
    "Background and Context",
    "What to Watch",
    "Editorial Note",
  ];
  const normalized = markdown.toLowerCase();
  return required.filter(
    (section) => !normalized.includes(section.toLowerCase()),
  );
}

function editorialDraftProblem(markdown: string): string | null {
  if (!markdown.trim()) return "empty draft";
  const words = countWords(markdown);
  if (words < 420) return `too short (${words} words)`;
  const missingSections = missingEditorialSections(markdown);
  if (missingSections.length > 0) {
    return `missing sections: ${missingSections.join(", ")}`;
  }
  if (!/editorial note/i.test(markdown)) return "missing editorial note";
  return null;
}

function providedContentDraftProblem(markdown: string): string | null {
  if (!markdown.trim()) return "empty draft";
  const words = countWords(markdown);
  if (words < 450) return `too short (${words} words)`;
  const missingSections = missingSourceFirstSections(markdown);
  if (missingSections.length > 0) {
    return `missing sections: ${missingSections.join(", ")}`;
  }
  if (!/source note/i.test(markdown)) return "missing source note";
  if (/presumed innocent until proven guilty|all charges are allegations/i.test(markdown)) {
    return "contains inappropriate criminal disclaimer";
  }
  return null;
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

function readableSourceLabel(source: SourceFirstPacket): string {
  const publisher = source.publisher.trim();
  if (publisher) {
    return publisher
      .replace(/^www\./i, "")
      .replace(/\.(com|org|net|co|us|uk)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .slice(0, 80);
  }

  return source.title.trim().replace(/\s+/g, " ").slice(0, 80) || "Source";
}

function labelLooksLikeRawCitation(label: string): boolean {
  return (
    /^https?:\/\//i.test(label.trim()) ||
    /^s\d+$/i.test(label.trim()) ||
    /^(source|read the source|article link)$/i.test(label.trim())
  );
}

function keepOnlyVerifiedSourceLinks(
  markdown: string,
  sources: SourceFirstPacket[],
): string {
  const allowedUrls = new Map<string, string>();
  const sourceUrlByHost = new Map<string, string>();
  const labelByUrl = new Map<string, string>();
  const labelByHost = new Map<string, string>();

  for (const source of sources) {
    const url = source.url.trim();
    if (!url) continue;
    const label = readableSourceLabel(source);
    allowedUrls.set(normalizedUrlKey(url), url);
    labelByUrl.set(normalizedUrlKey(url), label);
    const host = hostFromUrl(url);
    if (host && !sourceUrlByHost.has(host)) {
      sourceUrlByHost.set(host, url);
      labelByHost.set(host, label);
    }
  }

  const withMarkdownLinks = markdown.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (match, label, url) => {
      const key = normalizedUrlKey(String(url));
      const verifiedUrl = allowedUrls.get(key);
      if (verifiedUrl) {
        const safeLabel = labelLooksLikeRawCitation(String(label))
          ? (labelByUrl.get(key) ?? "Source")
          : String(label);
        return `[${safeLabel}](${verifiedUrl})`;
      }

      const host = hostFromUrl(String(url));
      const sameHostSourceUrl = sourceUrlByHost.get(host);
      if (sameHostSourceUrl) {
        const safeLabel = labelLooksLikeRawCitation(String(label))
          ? (labelByHost.get(host) ?? "Source")
          : String(label);
        return `[${safeLabel}](${sameHostSourceUrl})`;
      }

      return String(label);
    },
  );

  return withMarkdownLinks.replace(/\[(https?:\/\/[^\]\s]+)\]/g, (match, url) => {
    const key = normalizedUrlKey(String(url));
    const verifiedUrl = allowedUrls.get(key);
    if (verifiedUrl) return `[${labelByUrl.get(key) ?? "Source"}](${verifiedUrl})`;

    const host = hostFromUrl(String(url));
    const sameHostSourceUrl = sourceUrlByHost.get(host);
    if (sameHostSourceUrl) {
      return `[${labelByHost.get(host) ?? "Source"}](${sameHostSourceUrl})`;
    }

    return "";
  });
}

function ensureMinimumSourceLinksInDraft(
  markdown: string,
  sources: SourceFirstPacket[],
  minLinks: number,
): string {
  const currentLinks = countMarkdownLinks(markdown);
  if (currentLinks >= minLinks || sources.length === 0) return markdown;

  const linkedUrls = new Set(
    Array.from(markdown.matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)).map(
      (match) => normalizedUrlKey(String(match[1])),
    ),
  );

  const linksToAdd = sources
    .filter((source) => !linkedUrls.has(normalizedUrlKey(source.url)))
    .slice(0, minLinks - currentLinks)
    .map((source) => `[${readableSourceLabel(source)}](${source.url})`);

  if (linksToAdd.length === 0) return markdown;

  const citation = `This article draws on reporting from ${linksToAdd.join(", ")}.`;
  if (/source note/i.test(markdown)) {
    return markdown.replace(/(source note[^\n]*\n)/i, `$1\n${citation}\n`);
  }

  return `${markdown.trim()}\n\n### Source Note\n\n${citation}\n`;
}

function finalizeSourceFirstDraft(
  markdown: string,
  sources: SourceFirstPacket[],
  minLinks: number,
): string {
  const linked = keepOnlyVerifiedSourceLinks(
    normalizeArticleMarkdown(markdown).trim(),
    sources,
  );
  return ensureMinimumSourceLinksInDraft(linked, sources, minLinks);
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

export async function generateProvidedContentArticle(input: {
  query: string;
  model?: string;
}): Promise<ArticleAssistAllOutput> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");

  const providedDetails = summarizeForMode(input.query.trim(), SOURCE_FIRST_INPUT_LIMIT);
  const draftContents = [
    "You are a Kind Joe news writer.",
    "Write the article body as markdown only. Do not return JSON.",
    "",
    "The user pasted event details or notes below. Turn them into a complete publish-ready article.",
    "Use ONLY facts present in the provided details. Do not invent quotes, numbers, names, or outcomes.",
    "If something is unclear in the notes, say so in What We Still Don't Know.",
    "",
    "Hard rules:",
    "- Write a complete article of 500-750 words.",
    "- Use short paragraphs and plain English.",
    "- Do not use markdown tables.",
    "- Do not add external source links or fake citations.",
    "- Do not use criminal-law disclaimers unless the notes are about criminal charges.",
    "- End with a Source Note that says the article is based on details provided to Kind Joe.",
    "",
    "Structure:",
    "1. Markdown H1 headline.",
    "2. One-sentence subhead.",
    "3. Human lede.",
    "4. What Happened",
    "5. Short fact box (bullet list from the provided details).",
    "6. Why It Matters",
    "7. What Happens Next",
    "8. What We Still Don't Know (3 questions)",
    "9. Source Note",
    "",
    "PROVIDED DETAILS:",
    providedDetails,
  ].join("\n");

  const ai = new GoogleGenAI({ apiKey });
  const runDraftModel = async (contents: string) =>
    ai.models.generateContent({
      model: input.model || ARTICLE_ASSIST_MODEL,
      contents,
      config: articleAssistTextGenerateConfig({
        maxOutputTokens: 8192,
      }),
    });

  let draftResponse = await runDraftModel(draftContents);
  let rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
  let normalizedMarkdown = normalizeArticleMarkdown(rawDraftMarkdown).trim();

  let draftProblem = providedContentDraftProblem(normalizedMarkdown);
  if (draftProblem) {
    draftResponse = await runDraftModel(
      [
        draftContents,
        "",
        `IMPORTANT: The previous draft was rejected because it was ${draftProblem}.`,
        "Return markdown only.",
        "Write a complete 500-750 word article from the provided details only.",
        "Include every required section exactly once.",
        "Do not return JSON.",
      ].join("\n"),
    );
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = normalizeArticleMarkdown(rawDraftMarkdown).trim();
    draftProblem = providedContentDraftProblem(normalizedMarkdown);
  }

  if (draftProblem) {
    draftResponse = await runDraftModel(
      [
        "Expand this draft into a complete article using ONLY the provided details below.",
        "Target 500-750 words. Add missing sections if needed.",
        "Return markdown only.",
        "",
        "PROVIDED DETAILS:",
        providedDetails,
        "",
        "DRAFT TO EXPAND:",
        normalizedMarkdown,
      ].join("\n"),
    );
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = normalizeArticleMarkdown(rawDraftMarkdown).trim();
    draftProblem = providedContentDraftProblem(normalizedMarkdown);
  }

  if (draftProblem) {
    throw new Error(
      `AI returned an incomplete provided-content article draft: ${draftProblem}.`,
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
      topic: summarizeForMode(providedDetails, 1200),
      fallbackTitle,
      articleMarkdown: summarizeForMode(normalizedMarkdown, 1800),
      providedContent: true,
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
      sourceText: providedDetails,
      existing: tags,
      minCount: 12,
    }),
    excerpt: String(data.excerpt ?? fallbackExcerpt).trim() || fallbackExcerpt,
    draftMarkdown: normalizedMarkdown,
    seoDescription:
      String(data.seoDescription ?? fallbackExcerpt).trim() || fallbackExcerpt,
  };
}

export async function generateEditorialTopicArticle(input: {
  query: string;
  sources?: SourceFirstPacket[];
  model?: string;
}): Promise<ArticleAssistAllOutput> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");

  const sources = input.sources ?? [];
  const sourceContext =
    sources.length > 0
      ? summarizeForMode(
          sources
            .map((source) =>
              [
                `Publisher: ${source.publisher}`,
                `Title: ${source.title}`,
                `URL: ${source.url}`,
                `Context: ${source.extractedText}`,
              ].join("\n"),
            )
            .join("\n\n---\n\n"),
          SOURCE_FIRST_INPUT_LIMIT,
        )
      : "";

  const draftContents = [
    "You are a senior Kind Joe editorial writer.",
    "Write the article body as markdown only. Do not return JSON.",
    "",
    "This is an editorial explainer written in our newsroom voice when verified primary reporting is limited.",
    "Write like a real journalist offering context readers can trust — not generic AI filler.",
    "",
    "Hard rules:",
    "- Do NOT invent breaking-news facts, quotes, arrests, vote counts, dates, or official statements.",
    "- Do NOT pretend we have direct reporting we do not have.",
    "- You MAY explain general background, public context, why the topic matters, and what readers should watch for.",
    "- Use plain English, short paragraphs, and a confident but honest tone.",
    "- Write a complete article of 450-650 words.",
    "- Do not use markdown tables.",
    "- Do not stop mid-sentence or mid-section.",
    sources.length > 0
      ? "- When a limited source packet is provided, you may cite it with one inline markdown link using its exact URL."
      : "- Do not add fake citations or placeholder links.",
    "",
    "Structure:",
    "1. Markdown H1 headline.",
    "2. One-sentence subhead.",
    "3. Human lede that frames the topic for everyday readers.",
    "4. \"What We're Tracking\" section.",
    "5. \"Why It Matters\" section.",
    "6. \"Background and Context\" section.",
    "7. \"What to Watch\" section with 3 concrete watch items.",
    "8. \"Editorial Note\" explaining this is Kind Joe editorial context/analysis and noting when primary sources were limited.",
    "",
    "INPUT:",
    JSON.stringify({
      topic: input.query,
      limitedSources: sourceContext || null,
      mode: "editorial-topic-article-markdown",
    }),
  ].join("\n");

  const ai = new GoogleGenAI({ apiKey });
  const runDraftModel = async (contents: string) =>
    ai.models.generateContent({
      model: input.model || ARTICLE_ASSIST_MODEL,
      contents,
      config: articleAssistTextGenerateConfig({
        maxOutputTokens: 8192,
      }),
    });

  let draftResponse = await runDraftModel(draftContents);
  let rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
  let normalizedMarkdown = normalizeArticleMarkdown(rawDraftMarkdown).trim();
  if (sources.length > 0) {
    normalizedMarkdown = keepOnlyVerifiedSourceLinks(normalizedMarkdown, sources);
  }

  let draftProblem = editorialDraftProblem(normalizedMarkdown);
  if (draftProblem) {
    draftResponse = await runDraftModel(
      [
        draftContents,
        "",
        `IMPORTANT: The previous draft was rejected because it was ${draftProblem}.`,
        "Return markdown only.",
        "Write a complete 450-650 word editorial explainer.",
        "Include every required section exactly once.",
        "Finish with an Editorial Note section.",
        "Do not return JSON.",
      ].join("\n"),
    );
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = normalizeArticleMarkdown(rawDraftMarkdown).trim();
    if (sources.length > 0) {
      normalizedMarkdown = keepOnlyVerifiedSourceLinks(normalizedMarkdown, sources);
    }
    draftProblem = editorialDraftProblem(normalizedMarkdown);
  }

  if (draftProblem) {
    draftResponse = await runDraftModel(
      [
        "Expand this editorial draft into a complete 450-650 word article.",
        "Keep the same topic and facts. Add depth, context, and transitions.",
        "Include all required sections if any are missing.",
        "Return markdown only.",
        "",
        normalizedMarkdown,
      ].join("\n"),
    );
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = normalizeArticleMarkdown(rawDraftMarkdown).trim();
    if (sources.length > 0) {
      normalizedMarkdown = keepOnlyVerifiedSourceLinks(normalizedMarkdown, sources);
    }
    draftProblem = editorialDraftProblem(normalizedMarkdown);
  }

  if (draftProblem) {
    throw new Error(
      `AI returned an incomplete editorial article draft: ${draftProblem}.`,
    );
  }

  const fallbackTitle = titleFromMarkdown(normalizedMarkdown);
  const metadataContents = [
    "Return compact JSON metadata for this CMS editorial article.",
    "Do not include the article body.",
    "Tags must be lowercase kebab-case, specific, and 12-20 items.",
    "",
    "INPUT:",
    JSON.stringify({
      topic: input.query,
      fallbackTitle,
      articleMarkdown: summarizeForMode(normalizedMarkdown, 1800),
      editorial: true,
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
      sourceText: input.query,
      existing: tags,
      minCount: 12,
    }),
    excerpt: String(data.excerpt ?? fallbackExcerpt).trim() || fallbackExcerpt,
    draftMarkdown: normalizedMarkdown,
    seoDescription:
      String(data.seoDescription ?? fallbackExcerpt).trim() || fallbackExcerpt,
  };
}

export async function generateSourceFirstArticle(input: {
  query: string;
  sources: SourceFirstPacket[];
  model?: string;
}): Promise<ArticleAssistAllOutput> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");

  if (input.sources.length < 1) {
    throw new Error("At least 1 verified source is required for source-first mode.");
  }

  const minLinks = input.sources.length >= 2 ? 2 : 1;
  const minWords = input.sources.length >= 2 ? 500 : 450;

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
    "- Link text must be readable words such as the publisher name or story subject.",
    "- Never use a raw URL, source ID, or bracketed URL as visible link text.",
    "- Never shorten source URLs to a homepage, section page, tag page, or guessed article URL.",
    "- If unsure which source URL supports a sentence, use attribution text without a link.",
    "- Write a complete article of 500-750 words.",
    "- Use short paragraphs and plain English.",
    "- Do not use markdown tables. Write fact boxes as short bullet lists.",
    "- Do not include raw source packet IDs in the public article unless useful.",
    "- Do not stop mid-sentence or mid-section.",
    "- Finish every required section before ending.",
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
        maxOutputTokens: 8192,
      }),
    });

  let draftResponse = await runDraftModel(draftContents);
  let rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
  let normalizedMarkdown = finalizeSourceFirstDraft(
    rawDraftMarkdown,
    input.sources,
    minLinks,
  );

  let draftProblem = sourceFirstDraftProblem(normalizedMarkdown, {
    minWords,
    minLinks,
  });
  if (draftProblem) {
    draftResponse = await runDraftModel(
      [
        draftContents,
        "",
        `IMPORTANT: The previous draft was rejected because it was ${draftProblem}.`,
        "Return markdown only.",
        `Write a complete ${minWords}-750 word article.`,
        "Include every required section exactly once.",
        `Use at least ${minLinks} inline markdown link${minLinks === 1 ? "" : "s"} using exact source URLs from the source packets.`,
        "End with a Source Note section.",
        "Do not return JSON.",
      ].join("\n"),
    );
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = finalizeSourceFirstDraft(
      rawDraftMarkdown,
      input.sources,
      minLinks,
    );
    draftProblem = sourceFirstDraftProblem(normalizedMarkdown, {
      minWords,
      minLinks,
    });
  }

  if (draftProblem) {
    draftResponse = await runDraftModel(
      [
        "Expand this source-first draft into a complete article.",
        `Target ${minWords}-750 words.`,
        "Use only facts from the source packets below.",
        "Keep verified inline links. Add missing sections if needed.",
        "Return markdown only.",
        "",
        "SOURCE PACKETS:",
        safeSourceText,
        "",
        "DRAFT TO EXPAND:",
        normalizedMarkdown,
      ].join("\n"),
    );
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = finalizeSourceFirstDraft(
      rawDraftMarkdown,
      input.sources,
      minLinks,
    );
    draftProblem = sourceFirstDraftProblem(normalizedMarkdown, {
      minWords,
      minLinks,
    });
  }

  if (draftProblem) {
    const simplifiedPrompt = [
      "Write a complete markdown news article for Kind Joe.",
      `Target ${minWords}-750 words.`,
      "Use ONLY facts from the source packets below.",
      "Include sections: What Happened, Why It Matters, What Happens Next, What We Still Don't Know, Source Note.",
      `Include at least ${minLinks} inline markdown link${minLinks === 1 ? "" : "s"} using the exact source URLs provided.`,
      "Link text must be readable publisher names, not raw URLs.",
      "Return markdown only. Do not return JSON.",
      "",
      "TOPIC:",
      input.query,
      "",
      "SOURCE PACKETS:",
      safeSourceText,
    ].join("\n");
    draftResponse = await runDraftModel(simplifiedPrompt);
    rawDraftMarkdown = cleanGeneratedMarkdown(draftResponse.text?.trim() || "");
    normalizedMarkdown = finalizeSourceFirstDraft(
      rawDraftMarkdown,
      input.sources,
      minLinks,
    );
    draftProblem = sourceFirstDraftProblem(normalizedMarkdown, {
      minWords,
      minLinks,
    });
  }

  if (draftProblem) {
    throw new Error(
      `AI returned an incomplete source-first article draft: ${draftProblem}.`,
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
