export type SerperSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

type SerperOrganicResult = {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
  source?: unknown;
};

type SerperResponse = {
  organic?: SerperOrganicResult[];
};

function sourceFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0] || host;
  } catch {
    return "";
  }
}

function isUsableHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function searchSerperNews(
  query: string,
  options: { limit?: number } = {},
): Promise<SerperSearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured.");
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new Error("Search topic is required.");
  }

  const requestedLimit = Math.min(Math.max(options.limit ?? 5, 1), 10);
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: normalizedQuery,
      num: requestedLimit,
      type: "search",
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper search failed with status ${response.status}.`);
  }

  const data = (await response.json()) as SerperResponse;
  const seen = new Set<string>();
  const results: SerperSearchResult[] = [];

  for (const item of data.organic ?? []) {
    const url = String(item.link ?? "").trim();
    if (!isUsableHttpUrl(url)) continue;

    const key = url.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      title: String(item.title ?? "").trim(),
      url,
      snippet: String(item.snippet ?? "").trim(),
      source: String(item.source ?? "").trim() || sourceFromUrl(url),
    });

    if (results.length >= requestedLimit) break;
  }

  return results;
}
