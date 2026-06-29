const MAX_SOURCE_CHARS = 4500;
const SOURCE_VALIDATION_TIMEOUT_MS = 3500;
const SOURCE_URL_USER_AGENT =
  "Mozilla/5.0 (compatible; KindJoeSourceValidator/1.0)";

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

export async function gatherSourceFirstResearch(
  query: string,
  options: { searchLimit?: number; minSources?: number } = {},
): Promise<SourceFirstResearchResult> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) throw new Error("Search topic is required.");

  const requestedLimit = Math.min(Math.max(options.searchLimit ?? 4, 2), 4);
  const candidateLimit = Math.max(requestedLimit + 2, 5);
  const payload =
    (await searchGoogleCustom(normalizedQuery, candidateLimit)) ??
    (await searchGoogleNewsRss(normalizedQuery, candidateLimit));
  const skipped: SourceFirstResearchResult["skipped"] = [];
  const sources: SourceFirstPacket[] = [];
  const seenHosts = new Set<string>();

  const addPayloadSources = async (researchPayload: GeminiResearchPayload) => {
    const normalizedSources = (researchPayload.sources ?? []).map((item) => ({
      item,
      source: normalizeSourcePacket(item),
    }));

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
            "Google source result was missing a usable public URL or enough context.",
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

  await addPayloadSources(payload);

  const minSources = options.minSources ?? 2;
  if (sources.length < minSources) {
    const supplementalPayload = await searchGoogleNewsRss(
      `${normalizedQuery} latest`,
      candidateLimit + 4,
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
