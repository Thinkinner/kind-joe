import { db } from "@/db";
import { signals } from "@/db/schema";
import { desc, gt, lt } from "drizzle-orm";
import { processIntelRaw } from "./factory";
import Parser from "rss-parser";

const parser = new Parser();

const FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://kyivindependent.com/feed/",
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom",
];

/**
 * 1. SYNC REAL TIME NEWS (RSS Swarm)
 */
export async function syncRealTimeNews() {
  try {
    const selectedFeeds = [...FEEDS]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    // Fetch all RSS feeds in parallel
    const feedPromises = selectedFeeds.map((url) =>
      parser.parseURL(`${url}?t=${Date.now()}`).catch(() => ({ items: [] })),
    );
    const results = await Promise.all(feedPromises);
    const allItems = results.flatMap((f) => f.items.slice(0, 3));

    // Send the top items to the Factory for AI processing
    const processPromises = allItems.slice(0, 3).map((item) =>
      processIntelRaw({
        id: item.guid || item.link!,
        text: (item.title || "") + " " + (item.contentSnippet || ""),
        source: "RSS",
        timestamp: item.pubDate ? new Date(item.pubDate) : new Date(),
      }),
    );

    return await Promise.all(processPromises);
  } catch (error) {
    console.error("RSS Swarm Error:", error);
    return [];
  }
}

/**
 * 2. GET SIGNALS FROM DB (The missing export!)
 */
export async function getSignalsFromDB() {
  // Only history from the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return await db
    .select()
    .from(signals)
    .where(gt(signals.timestamp, yesterday))
    .orderBy(desc(signals.timestamp))
    .limit(50);
}

export async function purgeOldSignals() {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await db.delete(signals).where(lt(signals.timestamp, fortyEightHoursAgo));
  console.log("🧹 System Maintenance: Old signals purged.");
}
