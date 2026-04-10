"use client";

import { RawRssItem, RssSource } from "./types";

// List of CORS proxies to try in order. 
// Proxies are necessary because browsers block direct requests to RSS feeds (CORS).
const PROXY_STRATEGIES = [
  // Strategy 1: AllOrigins (Add timestamp to prevent caching)
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&t=${Date.now()}`,
  // Strategy 2: CORS Proxy IO
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  // Strategy 3: CodeTabs (Backup)
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

const fetchWithFallback = async (sourceUrl: string): Promise<string> => {
  let lastError: any;
  
  for (const createProxyUrl of PROXY_STRATEGIES) {
    try {
      const proxyUrl = createProxyUrl(sourceUrl);
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Proxy responded with ${response.status}`);
      }
      
      const text = await response.text().then((t) => t.replace(/^\uFEFF/, "").trimStart());
      // Proxies sometimes return HTML errors or JSON; real feeds vary (omit <?xml>, mixed case).
      const head = text.slice(0, 12000).toLowerCase();
      const looksLikeFeed =
        head.includes("<rss") ||
        head.includes("<feed") ||
        head.includes("<?xml") ||
        head.includes("<rdf:rdf") ||
        head.includes("<item") ||
        head.includes("<entry");
      if (!looksLikeFeed) {
        throw new Error("Response was not XML");
      }

      return text;
    } catch (error) {
      console.warn(`Fetch failed for ${sourceUrl} using proxy. trying next...`, error);
      lastError = error;
    }
  }
  
  throw lastError || new Error("All proxies failed");
};

const getElementText = (parent: Element, tagName: string): string => {
  const el = parent.getElementsByTagName(tagName)[0];
  return el?.textContent || "";
};

const parseXml = (xmlStr: string, sourceName: string): RawRssItem[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
  
  // Handle both RSS <item> and Atom <entry>
  const items = Array.from(xmlDoc.querySelectorAll("item, entry"));

  return items.map((item) => {
    const title = getElementText(item, "title") || "No Title";
    const link = getElementText(item, "link") || item.querySelector("link")?.getAttribute("href") || "";
    const pubDate = getElementText(item, "pubDate") || getElementText(item, "published") || getElementText(item, "updated");
    
    // Description can be in description, content:encoded, or content
    let description = getElementText(item, "description");
    const contentEncoded = getElementText(item, "content:encoded") || getElementText(item, "content");
    
    // Prefer content:encoded if description is too short or missing
    const fullContent = contentEncoded.length > description.length ? contentEncoded : description;

    // Image Extraction Strategy
    let imageUrl: string | null | undefined = null;

    // 1. Media Content/Group (common in news feeds)
    const mediaContent = item.getElementsByTagName("media:content")[0];
    if (mediaContent) imageUrl = mediaContent.getAttribute("url");
    
    // 2. Media Thumbnail
    if (!imageUrl) {
        const mediaThumbnail = item.getElementsByTagName("media:thumbnail")[0];
        if (mediaThumbnail) imageUrl = mediaThumbnail.getAttribute("url");
    }

    // 3. Enclosure
    if (!imageUrl) {
      const enclosure = item.querySelector("enclosure");
      if (enclosure?.getAttribute("type")?.startsWith("image")) {
        imageUrl = enclosure.getAttribute("url");
      }
    }

    // 4. Image inside description/content
    if (!imageUrl && fullContent) {
      // Improved regex to handle single/double quotes and various attributes
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
      const match = imgRegex.exec(fullContent);
      if (match) {
        imageUrl = match[1];
        
        // Handle relative URLs (common in some feeds)
        if (imageUrl.startsWith('/') && link) {
            try {
                // Try to resolve against the item's link origin
                const urlObj = new URL(link);
                imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
            } catch (e) {
                // If link is invalid or parsing fails, keep original or discard?
                // Often relative URLs in RSS are broken without base, but we try best effort.
            }
        }
      }
    }

    // Clean up snippets
    const cleanSnippet = (description || fullContent)
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') // Extract CDATA
      .replace(/<[^>]*>?/gm, "") // Strip HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .slice(0, 300);

    return {
      title,
      link,
      pubDate,
      contentSnippet: cleanSnippet,
      content: fullContent,
      imageUrl: imageUrl || undefined,
      sourceName
    };
  });
};

export const fetchAllFeeds = async (sources: RssSource[]): Promise<RawRssItem[]> => {
  const enabledSources = sources.filter(s => s.enabled);
  
  const promises = enabledSources.map(async (source) => {
    try {
      const xmlData = await fetchWithFallback(source.url);
      const items = parseXml(xmlData, source.name);
      console.log(`Successfully fetched ${items.length} items from ${source.name}`);
      return items;
    } catch (error) {
      console.error(`FAILED to fetch RSS feed: ${source.name}`, error);
      // Return empty array so one failure doesn't break the whole app
      return [];
    }
  });

  const results = await Promise.all(promises);
  const allItems = results.flat();
  
  // Sort by date descending
  return allItems.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  });
};