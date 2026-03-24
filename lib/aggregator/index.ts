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

const TWITTER_HANDLES = [
  "MarioNawfal",
  "spectatorindex",
  "BNONews",
  "unusual_whales",
  "disclosetv",
];

// Removed the broken jpost.com feed
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
];

export async function syncRealTimeNews() {
  const now = new Date();

  // CHANGED: Only accept news from the last 5 minutes (5 * 60 * 1000 milliseconds)
  const FIVE_MINUTES_AGO = now.getTime() - 5 * 60 * 1000;

  let aiCallsMade = 0;
  const MAX_AI_CALLS = 2;

  try {
    const allProcessed = [];
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const rapidApiHost = process.env.RAPIDAPI_HOST;

    // --- PART 1: X (TWITTER) SCAN ---
    console.log("🐦 X: Scanning high-frequency handles...");
    for (const handle of TWITTER_HANDLES) {
      if (aiCallsMade >= MAX_AI_CALLS) break;

      try {
        const response = await fetch(
          `https://${rapidApiHost}/user-tweets?user=${handle}&count=5`,
          {
            headers: {
              "x-rapidapi-key": rapidApiKey!,
              "x-rapidapi-host": rapidApiHost!,
            },
          },
        );
        const data = await response.json();
        const entries =
          data?.result?.timeline?.instructions?.[0]?.entries || [];

        for (const entry of entries) {
          if (aiCallsMade >= MAX_AI_CALLS) break;

          const tweet =
            entry?.content?.itemContent?.tweet_results?.result?.legacy;
          if (!tweet?.full_text || tweet.full_text.startsWith("RT @")) continue;

          // 1. STRICT 5-MINUTE FRESHNESS CHECK
          const tweetDate = new Date(tweet.created_at);
          if (tweetDate.getTime() < FIVE_MINUTES_AGO) {
            // It is older than 5 minutes. Skip it.
            continue;
          }

          const id = `x-${entry.entryId}`;
          const existing = await db
            .select()
            .from(signals)
            .where(eq(signals.id, id));
          if (existing.length > 0) continue;

          console.log(`🤖 AI Processing Tweet: ${handle}`);
          aiCallsMade++;

          const aiData = await analyzeSignalWithAI(tweet.full_text, "");
          if (!aiData) continue;

          const validatedDate = tweetDate > now ? now : tweetDate;

          const newSignal = {
            id,
            headline: aiData.intelHeadline,
            summary: aiData.intelSummary,
            source: "X" as const,
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
      } catch (e) {
        console.error(`X error:`, e);
      }
    }

    // --- PART 2: RSS SCAN ---
    console.log("📰 RSS: Scanning randomized global feeds...");
    const selectedFeeds = [...FEEDS]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4);

    for (const url of selectedFeeds) {
      if (aiCallsMade >= MAX_AI_CALLS) break;

      try {
        const feed = await parser.parseURL(`${url}?t=${Date.now()}`);

        for (const item of feed.items.slice(0, 3)) {
          if (aiCallsMade >= MAX_AI_CALLS) break;

          const id = item.guid || item.link!;
          const pubDate = item.pubDate ? new Date(item.pubDate) : now;

          // 1. STRICT 5-MINUTE FRESHNESS CHECK
          if (pubDate.getTime() < FIVE_MINUTES_AGO) {
            console.log(
              `⏩ Skipping old news (>5m): ${item.title?.slice(0, 30)}...`,
            );
            continue;
          }

          const existing = await db
            .select()
            .from(signals)
            .where(eq(signals.id, id));
          if (existing.length > 0) continue;

          console.log(`🤖 AI Processing RSS: ${item.title?.slice(0, 30)}...`);
          aiCallsMade++;

          const aiData = await analyzeSignalWithAI(
            item.title || "",
            item.contentSnippet || "",
          );
          if (!aiData) continue;

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
        console.error(`RSS Error:`, err);
      }
    }

    return allProcessed;
  } catch (error) {
    return [];
  }
}

export async function getSignalsFromDB() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return await db
    .select()
    .from(signals)
    .where(gt(signals.timestamp, yesterday))
    .orderBy(desc(signals.timestamp))
    .limit(50);
}

async function broadcastSignal(signal: any) {
  await pusher.trigger("aether-live", "new-signal", {
    ...signal,
    timestamp: signal.timestamp.getTime(),
  });
  await sendBeamsNotification(signal.headline, signal.city);
}

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
  } catch (e) {
    console.error(e);
  }
}
