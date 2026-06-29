import { searchSerperNews, type SerperSearchResult } from "@/lib/ai/serper-search";

const SOURCE_FETCH_USER_AGENT =
  "Mozilla/5.0 (compatible; KindJoeSourceFirstAssistant/1.0)";
const MIN_EXTRACTED_CHARS = 700;
const MAX_SOURCE_CHARS = 4500;

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

function stripHtml(input: string): string {
  return input
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitleFromHtml(html: string): string {
  const ogTitle = html.match(
    /<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  );
  if (ogTitle?.[1]) return stripHtml(ogTitle[1]).slice(0, 220);

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return title?.[1] ? stripHtml(title[1]).slice(0, 220) : "";
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
  const mainMatch = withoutNoise.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = withoutNoise.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const candidate = articleMatch?.[1] ?? mainMatch?.[1] ?? bodyMatch?.[1] ?? withoutNoise;
  const cleaned = stripHtml(candidate);
  if (cleaned.length >= MIN_EXTRACTED_CHARS) return cleaned;
  return stripHtml(withoutNoise);
}

function publisherFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isPrivateOrLoopbackUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
    if (hostname === "127.0.0.1" || hostname === "::1") return true;
    if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
    if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function fetchSourceText(result: SerperSearchResult): Promise<SourceFirstPacket> {
  if (isPrivateOrLoopbackUrl(result.url)) {
    throw new Error("Private or loopback URL blocked.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(result.url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "User-Agent": SOURCE_FETCH_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}.`);
    }

    const html = await response.text();
    const extractedText = extractMainTextFromHtml(html);
    if (extractedText.length < MIN_EXTRACTED_CHARS) {
      throw new Error("Not enough readable article text.");
    }

    return {
      id: "",
      title: extractTitleFromHtml(html) || result.title || result.source,
      url: result.url,
      publisher: result.source || publisherFromUrl(result.url),
      snippet: result.snippet,
      extractedText: extractedText.slice(0, MAX_SOURCE_CHARS),
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

  const searchResults = await searchSerperNews(normalizedQuery, {
    limit: options.searchLimit ?? 5,
  });
  const skipped: SourceFirstResearchResult["skipped"] = [];
  const sources: SourceFirstPacket[] = [];
  const seenHosts = new Set<string>();

  for (const result of searchResults) {
    try {
      const host = publisherFromUrl(result.url).toLowerCase();
      if (host && seenHosts.has(host)) {
        skipped.push({
          url: result.url,
          title: result.title,
          reason: "Duplicate publisher skipped.",
        });
        continue;
      }

      const source = await fetchSourceText(result);
      source.id = `S${sources.length + 1}`;
      sources.push(source);
      if (host) seenHosts.add(host);
    } catch (error) {
      skipped.push({
        url: result.url,
        title: result.title,
        reason: error instanceof Error ? error.message : "Source fetch failed.",
      });
    }
  }

  const minSources = options.minSources ?? 2;
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
