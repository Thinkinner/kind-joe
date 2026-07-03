import { GoogleGenAI } from "@google/genai";

const MAX_SOURCE_CHARS = 4500;
const SOURCE_VALIDATION_TIMEOUT_MS = 3500;
const SOURCE_URL_USER_AGENT =
  "Mozilla/5.0 (compatible; KindJoeSourceValidator/1.0)";
const SOURCE_FIRST_RESEARCH_MODEL =
  process.env.SOURCE_FIRST_RESEARCH_MODEL || "gemini-2.5-flash";

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
  /** True when fewer than the preferred source count were found but research still returned. */
  limitedSources: boolean;
  /** True when the input is pasted event/details text rather than a search topic. */
  providedContent: boolean;
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

type GoogleCustomSearchResponse = {
  items?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
    displayLink?: string;
  }>;
};

type GroundingChunk = {
  web?: {
    uri?: string;
    title?: string;
  };
};

function extractFirstUrl(value: string): string | null {
  return value.match(/https?:\/\/[^\s)]+/i)?.[0] ?? null;
}

function extractUrls(value: string): string[] {
  return Array.from(value.matchAll(/https?:\/\/[^\s)]+/gi)).map((match) =>
    (match[0] ?? "").replace(/[.,;]+$/, ""),
  );
}

function withoutUrls(value: string): string {
  return value.replace(/https?:\/\/[^\s)]+/gi, " ").replace(/\s+/g, " ").trim();
}

function importantTokens(value: string): Set<string> {
  const stopwords = new Set([
    "about",
    "after",
    "again",
    "against",
    "article",
    "breaking",
    "from",
    "have",
    "into",
    "latest",
    "live",
    "news",
    "over",
    "said",
    "says",
    "that",
    "their",
    "this",
    "with",
  ]);
  return new Set(
    value
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !stopwords.has(token)),
  );
}

function tokenOverlapScore(tokens: Set<string>, source: SourceFirstPacket): number {
  const haystack = `${source.title} ${source.snippet} ${source.extractedText}`.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkup(value: string): string {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, " "));
}

function getXmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ? decodeXmlEntities(match[1]) : "";
}

function getSourceFromXml(block: string): { name: string; url: string } {
  const match = block.match(/<source\b[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
  return {
    url: match?.[1] ? decodeXmlEntities(match[1]) : "",
    name: match?.[2] ? decodeXmlEntities(match[2]) : "",
  };
}

function buildExtractedText(parts: string[]): string {
  const text = parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length >= 50 ? text.slice(0, MAX_SOURCE_CHARS) : "";
}

function htmlMeta(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeXmlEntities(match[1]);
  }
  return "";
}

function htmlTitle(html: string): string {
  return decodeXmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function htmlToText(html: string): string {
  return stripMarkup(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " "),
  );
}

async function sourceFromUrl(url: string): Promise<GeminiResearchPayload> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
      "User-Agent": SOURCE_URL_USER_AGENT,
    },
  });
  if (!response.ok) {
    return {
      sources: [],
      skipped: [{ url, title: url, reason: `Input URL returned ${response.status}.` }],
    };
  }

  const finalUrl = response.url || url;
  const html = await response.text();
  const title = htmlMeta(html, "og:title") || htmlTitle(html) || finalUrl;
  const snippet =
    htmlMeta(html, "og:description") ||
    htmlMeta(html, "description") ||
    title;
  const extractedText = buildExtractedText([title, snippet, htmlToText(html).slice(0, 2500)]);

  return {
    sources: [
      {
        title,
        url: finalUrl,
        publisher: publisherFromUrl(finalUrl),
        snippet,
        extractedText,
      },
    ],
    skipped: [],
  };
}

async function searchGoogleCustom(
  query: string,
  limit: number,
): Promise<GeminiResearchPayload | null> {
  const cx = (
    process.env.GOOGLE_SEARCH_ENGINE_ID ??
    process.env.GOOGLE_CSE_ID ??
    ""
  ).trim();
  if (!cx) return null;

  const apiKey = (
    process.env.GOOGLE_SEARCH_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    ""
  ).trim();
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured.");

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(Math.min(Math.max(limit, 1), 10)));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Google Custom Search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GoogleCustomSearchResponse;
  return {
    sources: (payload.items ?? []).map((item) => {
      const title = String(item.title ?? "").trim();
      const snippet = String(item.snippet ?? "").trim();
      const url = String(item.link ?? "").trim();
      return {
        title,
        url,
        publisher: String(item.displayLink ?? "").trim() || publisherFromUrl(url),
        snippet,
        extractedText: buildExtractedText([title, snippet]),
      };
    }),
    skipped: [],
  };
}

async function searchGeminiGroundedDirect(
  query: string,
  limit: number,
): Promise<GeminiResearchPayload | null> {
  const apiKey = (process.env.GOOGLE_API_KEY ?? "").trim();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: SOURCE_FIRST_RESEARCH_MODEL,
    contents: [
      "Find 4 recent direct publisher article URLs for this news topic.",
      "Use Google Search grounding.",
      "Return markdown bullets only in the exact form:",
      "- Title | Publisher | https://direct-article-url",
      "Do not use Google News, RSS, search pages, tag pages, or homepages.",
      "",
      `Topic: ${query}`,
    ].join("\n"),
    config: {
      tools: [{ googleSearch: {} }],
      maxOutputTokens: 900,
    },
  });

  const summary = String(response.text ?? "").trim();
  const chunks =
    (response.candidates?.[0]?.groundingMetadata?.groundingChunks ??
      []) as GroundingChunk[];
  const seen = new Set<string>();
  const chunkSources = chunks
    .map((chunk) => {
      const url = String(chunk.web?.uri ?? "").trim();
      const title = String(chunk.web?.title ?? "").trim();
      return { url, title };
    })
    .filter((source) => {
      if (!source.url || seen.has(source.url)) return false;
      seen.add(source.url);
      const host = publisherFromUrl(source.url).toLowerCase();
      if (!host || host === "news.google.com") return false;
      if (/\/(search|tag|tags|category|topics|rss)(\/|$)/i.test(source.url)) {
        return false;
      }
      return true;
    })
    .slice(0, Math.max(limit, 6))
    .map((source) => ({
      title: source.title || publisherFromUrl(source.url),
      url: source.url,
      publisher: publisherFromUrl(source.url),
      snippet: summary || source.title,
      extractedText: buildExtractedText([source.title, summary]),
    }));

  const textSources = summary
    .split(/\r?\n/)
    .flatMap((line) => {
      const urls = extractUrls(line);
      return urls.map((url) => {
        const [title = "", publisher = ""] = line
          .replace(url, "")
          .replace(/^[-*\s]+/, "")
          .split("|")
          .map((part) => part.trim());
        return {
          title: title || publisherFromUrl(url),
          url,
          publisher: publisher || publisherFromUrl(url),
          snippet: title || summary,
          extractedText: buildExtractedText([title, publisher, summary]),
        };
      });
    });

  return { sources: [...textSources, ...chunkSources], skipped: [] };
}

async function searchGoogleNewsRss(
  query: string,
  limit: number,
): Promise<GeminiResearchPayload> {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": SOURCE_URL_USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Google News search failed with status ${response.status}.`);
  }

  const xml = await response.text();
  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
    .map((match) => match[1] ?? "")
    .slice(0, Math.max(limit, 8));

  return {
    sources: items.map((item) => {
      const titleWithPublisher = getXmlTag(item, "title");
      const link = getXmlTag(item, "link");
      const description = stripMarkup(getXmlTag(item, "description"));
      const source = getSourceFromXml(item);
      const suffix = source.name ? ` - ${source.name}` : "";
      const title =
        suffix && titleWithPublisher.endsWith(suffix)
          ? titleWithPublisher.slice(0, -suffix.length).trim()
          : titleWithPublisher;

      return {
        title,
        url: link,
        publisher: source.name || publisherFromUrl(source.url || link),
        snippet: description || title,
        extractedText: buildExtractedText([title, description]),
      };
    }),
    skipped: [],
  };
}

async function normalizeSourcePacket(
  source: NonNullable<GeminiResearchPayload["sources"]>[number],
): Promise<SourceFirstPacket | null> {
  let url = String(source.url ?? "").trim();
  if (!isUsablePublicUrl(url)) return null;

  if (isGoogleNewsRedirectUrl(url)) {
    const resolved = await resolvePublisherUrl(url);
    if (!resolved) return null;
    url = resolved.url;
    if (resolved.title && !String(source.title ?? "").trim()) {
      source = { ...source, title: resolved.title };
    }
  }

  if (publisherFromUrl(url).toLowerCase() === "news.google.com") return null;

  let extractedText = String(source.extractedText ?? source.snippet ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SOURCE_CHARS);

  if (extractedText.length < 80) {
    try {
      const payload = await sourceFromUrl(url);
      const fetched = payload.sources?.[0];
      if (fetched?.extractedText) {
        extractedText = String(fetched.extractedText).slice(0, MAX_SOURCE_CHARS);
      }
      if (!String(source.title ?? "").trim() && fetched?.title) {
        source = { ...source, title: fetched.title };
      }
      if (!String(source.snippet ?? "").trim() && fetched?.snippet) {
        source = { ...source, snippet: fetched.snippet };
      }
    } catch {
      // Keep whatever context we already have.
    }
  }

  if (extractedText.length < 80) return null;

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
  const timeout = setTimeout(() => controller.abort(), SOURCE_VALIDATION_TIMEOUT_MS);

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

function isGoogleNewsRedirectUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === "news.google.com";
  } catch {
    return false;
  }
}

async function resolvePublisherUrl(
  url: string,
): Promise<{ url: string; title?: string } | null> {
  if (!isUsablePublicUrl(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
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

    const finalUrl = response.url || url;
    if (!isUsablePublicUrl(finalUrl) || isGoogleNewsRedirectUrl(finalUrl)) {
      return null;
    }

    if (response.ok) {
      const html = await response.text();
      const title = htmlMeta(html, "og:title") || htmlTitle(html);
      return { url: finalUrl, title: title || undefined };
    }

    if (response.status === 404 || response.status === 410) return null;
    return { url: finalUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichSourceFromUrl(source: SourceFirstPacket): Promise<SourceFirstPacket> {
  if (source.extractedText.length >= 250) return source;

  try {
    const payload = await sourceFromUrl(source.url);
    const enriched = normalizeSourcePacket(payload.sources?.[0]);
    if (!enriched) return source;

    return {
      ...source,
      title: enriched.title || source.title,
      publisher: enriched.publisher || source.publisher,
      snippet: enriched.snippet || source.snippet,
      extractedText: enriched.extractedText || source.extractedText,
      url: enriched.url || source.url,
    };
  } catch {
    return source;
  }
}

function payloadHasSources(payload: GeminiResearchPayload | null | undefined): boolean {
  return Boolean(payload?.sources?.some((item) => Boolean(String(item.url ?? "").trim())));
}

/** Detect when the user pasted event notes or a full write-up instead of a search query. */
export function isProvidedContentInput(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 200) return false;

  const textWithoutUrls = withoutUrls(trimmed);
  const wordCount = textWithoutUrls.split(/\s+/).filter(Boolean).length;
  const lineCount = trimmed.split(/\r?\n/).filter((line) => line.trim()).length;
  const hasMultipleParagraphs = /\n\s*\n/.test(trimmed) || lineCount >= 4;

  if (wordCount >= 60 && trimmed.length >= 350) return true;
  if (wordCount >= 40 && hasMultipleParagraphs) return true;
  if (extractFirstUrl(trimmed) && textWithoutUrls.length >= 180) return true;

  return false;
}

export async function gatherSourceFirstResearch(
  query: string,
  options: {
    searchLimit?: number;
    minSources?: number;
    /** When false, return partial results instead of throwing if sources are scarce. */
    requireMinSources?: boolean;
  } = {},
): Promise<SourceFirstResearchResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("Search topic is required.");

  if (isProvidedContentInput(normalizedQuery)) {
    return {
      query: normalizedQuery,
      sources: [],
      skipped: [
        {
          url: "",
          title: "Provided content",
          reason:
            "Input looks like pasted event details. Skipping web search and writing from provided text.",
        },
      ],
      limitedSources: true,
      providedContent: true,
    };
  }

  const requestedLimit = Math.min(Math.max(options.searchLimit ?? 4, 2), 4);
  const candidateLimit = Math.max(requestedLimit + 2, 5);
  const skipped: SourceFirstResearchResult["skipped"] = [];
  const sources: SourceFirstPacket[] = [];
  const seenHosts = new Set<string>();

  const addPayloadSources = async (researchPayload: GeminiResearchPayload) => {
    const normalizedSources = await Promise.all(
      (researchPayload.sources ?? []).map(async (item) => ({
        item,
        source: await normalizeSourcePacket(item),
      })),
    );

    const validations = await Promise.all(
      normalizedSources.map(async ({ source }) => {
        if (!source) return null;
        return validateSourceUrl(source.url);
      }),
    );

    for (const [index, { item, source: normalizedSource }] of normalizedSources.entries()) {
      if (!normalizedSource) {
        skipped.push({
          url: String(item.url ?? ""),
          title: String(item.title ?? ""),
          reason:
            "Source result was missing a usable direct public URL or enough context.",
        });
        continue;
      }

      const validation = validations[index];
      if (!validation?.ok) {
        skipped.push({
          url: normalizedSource.url,
          title: normalizedSource.title,
          reason: validation?.reason ?? "Source URL could not be validated.",
        });
        continue;
      }
      normalizedSource.url = validation.url;
      const finalPublisher = publisherFromUrl(normalizedSource.url);
      if (finalPublisher) normalizedSource.publisher = finalPublisher;
      const sourceTitleHost = publisherFromUrl(normalizedSource.title).toLowerCase();
      const titleLooksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(
        normalizedSource.title,
      );
      if (
        !normalizedSource.title ||
        sourceTitleHost ||
        titleLooksLikeDomain ||
        normalizedSource.title.toLowerCase() === normalizedSource.publisher.toLowerCase()
      ) {
        normalizedSource.title = String(item.title ?? normalizedSource.publisher)
          .trim()
          .slice(0, 220);
      }

      const host = publisherFromUrl(normalizedSource.url).toLowerCase();
      const dedupeKey =
        host === "news.google.com"
          ? normalizedSource.publisher.toLowerCase() || host
          : host;
      if (dedupeKey && seenHosts.has(dedupeKey)) {
        skipped.push({
          url: normalizedSource.url,
          title: normalizedSource.title,
          reason: "Duplicate publisher skipped.",
        });
        continue;
      }

      normalizedSource.id = `S${sources.length + 1}`;
      sources.push(normalizedSource);
      if (dedupeKey) seenHosts.add(dedupeKey);
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

  const inputUrl = extractFirstUrl(normalizedQuery);
  let searchQuery = normalizedQuery;
  if (inputUrl) {
    const directPayload = await sourceFromUrl(inputUrl);
    await addPayloadSources(directPayload);
    const primaryTitle = sources[0]?.title;
    searchQuery = primaryTitle || withoutUrls(normalizedQuery);
  }

  const resolvedSearchQuery =
    searchQuery || withoutUrls(normalizedQuery) || normalizedQuery;
  const customSearchPayload = await searchGoogleCustom(
    resolvedSearchQuery,
    candidateLimit,
  );
  if (payloadHasSources(customSearchPayload)) {
    await addPayloadSources(customSearchPayload!);
  }

  if (sources.length < requestedLimit) {
    const groundedPayload = await searchGeminiGroundedDirect(
      resolvedSearchQuery,
      candidateLimit,
    );
    if (payloadHasSources(groundedPayload)) {
      await addPayloadSources(groundedPayload!);
    }
  }

  const relevanceTokens = importantTokens(
    searchQuery || withoutUrls(normalizedQuery) || normalizedQuery,
  );
  const minSources = options.minSources ?? 2;
  const requireMinSources = options.requireMinSources ?? true;
  if (sources.length > 1 && relevanceTokens.size >= 2) {
    const primary = sources[0];
    const relevantSources = sources.filter((source, index) => {
      if (index === 0) return true;
      return tokenOverlapScore(relevanceTokens, source) >= 2;
    });
    const canFilter =
      relevantSources.length >= minSources ||
      (!requireMinSources && relevantSources.length >= 1);
    if (canFilter && relevantSources.length !== sources.length) {
      const removed = sources.filter((source) => !relevantSources.includes(source));
      skipped.push(
        ...removed.map((source) => ({
          url: source.url,
          title: source.title,
          reason: `Source did not match the primary topic: ${primary.title}`,
        })),
      );
      sources.length = 0;
      sources.push(...relevantSources.map((source, index) => ({ ...source, id: `S${index + 1}` })));
    }
  }

  if (sources.length < minSources) {
    const supplementalPayload = await searchGoogleNewsRss(
      `${searchQuery || normalizedQuery} latest`,
      candidateLimit + 4,
    );
    await addPayloadSources(supplementalPayload);
  }

  if (sources.length > 0) {
    const enriched = await Promise.all(sources.map((source) => enrichSourceFromUrl(source)));
    sources.length = 0;
    sources.push(...enriched.map((source, index) => ({ ...source, id: `S${index + 1}` })));
  }

  const limitedSources = sources.length < minSources;
  if (limitedSources && requireMinSources) {
    throw new Error(
      `Only ${sources.length} usable direct source${sources.length === 1 ? "" : "s"} found. At least ${minSources} are required. Configure GOOGLE_CSE_ID/GOOGLE_SEARCH_ENGINE_ID or enable Gemini grounded search with GOOGLE_API_KEY, then try a more specific topic.`,
    );
  }

  return {
    query: normalizedQuery,
    sources,
    skipped,
    limitedSources,
    providedContent: false,
  };
}
