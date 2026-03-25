import { db } from "@/db";
import { signals } from "@/db/schema";
import { analyzeSignalWithAI } from "./ai";
import { desc, eq, gt } from "drizzle-orm";
import Parser from "rss-parser";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

const parser = new Parser();

// --- GLOBAL RSS SOURCES ---
const FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://www.theguardian.com/world/rss",
  "https://rss.dw.com/rdf/rss-en-all",
  "https://www.france24.com/en/rss",
  "https://search.cnbc.com/rs/search/all/view.rss?partnerId=445",
  "https://feeds.a.dj.com/rss/RSSWorldNews.xml",
  "https://www.ft.com/?format=rss",
  "https://finance.yahoo.com/news/rssindex",
  "https://www.investing.com/rss/news.rss",
  "https://kyivindependent.com/feed/",
  "https://nypost.com/feed/",
  "https://nypost.com/us-news/feed/",
  "https://nypost.com/world-news/feed/",
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom",
];

/**
 * SYNC REAL TIME NEWS
 * Now handles RSS feeds only.
 * X (Twitter) and Telegram are now handled instantly via Webhooks.
 */
export async function syncRealTimeNews() {
  const now = new Date();

  // Only accept news from the last 10 minutes to keep it ultra-fresh
  const FRESHNESS_LIMIT = now.getTime() - 10 * 60 * 1000;

  let aiCallsMade = 0;
  const MAX_AI_CALLS = 2; // Limit per run to prevent Vercel timeouts

  try {
    const allProcessed = [];

    console.log("📰 RSS: Scanning randomized global feeds...");
    // Shuffle and pick 5 feeds to scan per run
    const selectedFeeds = [...FEEDS]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    for (const url of selectedFeeds) {
      if (aiCallsMade >= MAX_AI_CALLS) break;

      try {
        const feed = await parser.parseURL(`${url}?t=${Date.now()}`);

        for (const item of feed.items.slice(0, 3)) {
          if (aiCallsMade >= MAX_AI_CALLS) break;

          const id = item.guid || item.link!;
          const pubDate = item.pubDate ? new Date(item.pubDate) : now;

          // 1. Freshness Check (10 mins)
          if (pubDate.getTime() < FRESHNESS_LIMIT) continue;

          // 2. Duplicate Check
          const existing = await db
            .select()
            .from(signals)
            .where(eq(signals.id, id));
          if (existing.length > 0) continue;

          console.log(`🤖 AI Processing RSS: ${item.title?.slice(0, 30)}...`);
          aiCallsMade++;

          // 3. AI Enrichment
          const aiData = await analyzeSignalWithAI(
            item.title || "",
            item.contentSnippet || "",
          );
          if (!aiData) continue;

          // 4. Future-proofing timestamp
          const validatedDate = pubDate > now ? now : pubDate;

          const newSignal = {
            id,
            headline: aiData.intelHeadline,
            summary: aiData.intelSummary,
            source: "RSS" as const,
            category: aiData.category,
            lat: aiData.lat,
            lng: aiData.lng,
            city: aiData.city,
            country: aiData.country,
            impactScore: aiData.impactScore,
            tags: aiData.tags,
            timestamp: validatedDate,
          };

          const inserted = await db
            .insert(signals)
            .values(newSignal)
            .onConflictDoNothing()
            .returning();
          if (inserted.length > 0) {
            await broadcastSignal(newSignal);
            allProcessed.push(newSignal);
          }
        }
      } catch (err) {
        console.error(`RSS Error for ${url}:`, err);
      }
    }

    return allProcessed;
  } catch (error) {
    console.error("Global Sync Error:", error);
    return [];
  }
}

/**
 * DB FETCH
 * Used to load the history on page refresh (Last 12 hours)
 */
export async function getSignalsFromDB() {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  return await db
    .select()
    .from(signals)
    .where(gt(signals.timestamp, twelveHoursAgo))
    .orderBy(desc(signals.timestamp))
    .limit(50);
}

/**
 * BROADCAST HELPER
 */
async function broadcastSignal(signal: any) {
  // Update Globe & Feed via Pusher Channels
  await pusher.trigger("aether-live", "new-signal", {
    ...signal,
    timestamp: signal.timestamp.getTime(),
  });

  // Trigger OS Notification via Pusher Beams
  await sendBeamsNotification(signal.headline, signal.city);
}

/**
 * PUSHER BEAMS (Push Notifications)
 */
async function sendBeamsNotification(headline: string, city: string) {
  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;
  if (!instanceId || !secretKey) return;

  try {
    await fetch(
      `https://${instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${instanceId}/publishes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
          interests: ["hello"],
          web: {
            notification: {
              title: "🚨 Breaking Signal",
              body: `${headline} (${city})`,
              deep_link:
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            },
          },
        }),
      },
    );
  } catch (err) {
    console.error("Beams notification error:", err);
  }
}
