import { GoogleGenAI, Type, type Schema } from "@google/genai";

const MAX_SOURCE_CHARS = 4500;
const SOURCE_URL_USER_AGENT =
  "Mozilla/5.0 (compatible; KindJoeSourceValidator/1.0)";
const SOURCE_FIRST_RESEARCH_MODEL =
  process.env.GEMINI_ARTICLE_ASSIST_MODEL?.trim() || "gemini-3.5-flash";

const SOURCE_FIRST_RESEARCH_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    sources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
          publisher: { type: Type.STRING },
          snippet: { type: Type.STRING },
          extractedText: { type: Type.STRING },
        },
        required: ["title", "url", "publisher", "snippet", "extractedText"],
      },
    },
    skipped: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          url: { type: Type.STRING },
          title: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["url", "title", "reason"],
      },
    },
  },
  required: ["sources"],
};

export type SourceFirstPacket = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  extractedText: string;
};

export type SourceFirstResearchResult = {
  query: string;
  sources: SourceFirstPacket[];
  skipped: Array<{
    url: string;
    title: string;
    reason: string;
  }>;
};

function publisherFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isUsablePublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
    if (hostname === "127.0.0.1" || hostname === "::1") return false;
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return false;
    if (/^192\.168\.\d+\.\d+$/.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
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
      if (depth === 0) return source.slice(start, i + 1).trim();
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

  throw new Error("Google research returned malformed JSON. Please try again.");
}

type GeminiResearchPayload = {
  sources?: Array<{
    title?: unknown;
    url?: unknown;
    publisher?: unknown;
    snippet?: unknown;
    extractedText?: unknown;
  }>;
  skipped?: Array<{
    url?: unknown;
    title?: unknown;
    reason?: unknown;
  }>;
};

function normalizeSourcePacket(
  source: NonNullable<GeminiResearchPayload["sources"]>[number],
): SourceFirstPacket | null {
  const url = String(source.url ?? "").trim();
  if (!isUsablePublicUrl(url)) return null;

  const extractedText = String(source.extractedText ?? source.snippet ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_CHARS);
  if (extractedText.length < 100) return null;

  const publisher = String(source.publisher ?? "").trim() || publisherFromUrl(url);
  return {
    id: "",
    title: String(source.title ?? (publisher || "Source")).trim().slice(0, 220),
    url,
    publisher,
    snippet: String(source.snippet ?? "").trim().slice(0, 500),
    extractedText,
  };
}

async function validateSourceUrl(
  url: string,
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": SOURCE_URL_USER_AGENT,
      },
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
          "User-Agent": SOURCE_URL_USER_AGENT,
        },
      });
    }

    if (response.status === 404 || response.status === 410) {
      return { ok: false, reason: `Source URL returned ${response.status}.` };
    }

    if (response.status >= 400 && response.status !== 401 && response.status !== 403) {
      return { ok: false, reason: `Source URL returned ${response.status}.` };
    }

    return {
      ok: true,
      url: response.url || url,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error ? error.message : "Source URL could not be validated.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function gatherSourceFirstResearch(
  query: string,
  options: { searchLimit?: number; minSources?: number } = {},
): Promise<SourceFirstResearchResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("Search topic is required.");
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");

  const requestedLimit = Math.min(Math.max(options.searchLimit ?? 5, 2), 5);
  const ai = new GoogleGenAI({ apiKey });
  const researchPrompt = [
      "Use Google Search grounding and URL context to research this news topic.",
      `Topic: ${normalizedQuery}`,
      "",
      `Find ${requestedLimit} credible, public web sources from distinct publishers.`,
      "Read enough of each source to produce a source packet that can support a newsroom article.",
      "Prefer primary reporting, official statements, public records, and reputable local/national news.",
      "Do not invent URLs, publishers, quotes, facts, or source text.",
      "Return compact JSON only. No markdown.",
      "",
      "For each source:",
      "- title: page/article title",
      "- url: exact canonical public URL",
      "- publisher: source publication or organization",
      "- snippet: concise summary of what the source supports",
      "- extractedText: 50-120 words of relevant factual notes from the source, paraphrased or quoted only when clearly supported",
    ].join("\n");
  const runResearch = async (contents: string) =>
    ai.models.generateContent({
      model: SOURCE_FIRST_RESEARCH_MODEL,
      contents,
      config: {
        tools: [{ googleSearch: {} }, { urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: SOURCE_FIRST_RESEARCH_SCHEMA,
        maxOutputTokens: 8192,
      },
    });

  const response = await runResearch(researchPrompt);
  let raw = response.text?.trim() || "{}";
  let payload: GeminiResearchPayload;
  try {
    payload = parseGeneratedJson<GeminiResearchPayload>(raw);
  } catch {
    const retryResponse = await runResearch(
      [
        researchPrompt,
        "",
        "IMPORTANT: Return valid, complete JSON only.",
        "Keep extractedText short. Escape quotes inside strings. Do not end mid-string.",
      ].join("\n"),
    );
    raw = retryResponse.text?.trim() || "{}";
    payload = parseGeneratedJson<GeminiResearchPayload>(raw);
  }
  const skipped: SourceFirstResearchResult["skipped"] = [];
  const sources: SourceFirstPacket[] = [];
  const seenHosts = new Set<string>();

  const addPayloadSources = async (researchPayload: GeminiResearchPayload) => {
    for (const item of researchPayload.sources ?? []) {
      const source = normalizeSourcePacket(item);
      if (!source) {
        skipped.push({
          url: String(item.url ?? ""),
          title: String(item.title ?? ""),
          reason:
            "Google source result was missing a usable public URL or enough context.",
        });
        continue;
      }

      const validation = await validateSourceUrl(source.url);
      if (!validation.ok) {
        skipped.push({
          url: source.url,
          title: source.title,
          reason: validation.reason,
        });
        continue;
      }
      source.url = validation.url;

      const host = publisherFromUrl(source.url).toLowerCase();
      if (host && seenHosts.has(host)) {
        skipped.push({
          url: source.url,
          title: source.title,
          reason: "Duplicate publisher skipped.",
        });
        continue;
      }

      source.id = `S${sources.length + 1}`;
      sources.push(source);
      if (host) seenHosts.add(host);
      if (sources.length >= requestedLimit) break;
    }

    for (const item of researchPayload.skipped ?? []) {
      skipped.push({
        url: String(item.url ?? ""),
        title: String(item.title ?? ""),
        reason: String(item.reason ?? "Google source was skipped."),
      });
    }
  };

  await addPayloadSources(payload);

  const minSources = options.minSources ?? 2;
  if (sources.length < minSources) {
    const supplementalResponse = await runResearch(
      [
        researchPrompt,
        "",
        `Only ${sources.length} usable source${sources.length === 1 ? "" : "s"} passed validation.`,
        "Find additional credible sources from different publishers.",
        `Avoid these hostnames: ${Array.from(seenHosts).join(", ") || "none"}.`,
        "Return complete compact JSON only.",
      ].join("\n"),
    );
    const supplementalPayload = parseGeneratedJson<GeminiResearchPayload>(
      supplementalResponse.text?.trim() || "{}",
    );
    await addPayloadSources(supplementalPayload);
  }

  if (sources.length < minSources) {
    throw new Error(
      `Only ${sources.length} usable source${sources.length === 1 ? "" : "s"} found. At least ${minSources} are required.`,
    );
  }

  return {
    query: normalizedQuery,
    sources,
    skipped,
  };
}
