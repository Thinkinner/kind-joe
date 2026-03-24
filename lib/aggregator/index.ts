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
const FEEDS = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://search.cnbc.com/rs/search/all/view.rss?partnerId=445",
  "https://finance.yahoo.com/news/rssindex",
  "https://kyivindependent.com/feed/",
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.atom",
];

export async function syncRealTimeNews() {
  const now = new Date();
  const ONE_HOUR_AGO = now.getTime() - 60 * 60 * 1000;

  try {
    const allProcessed = [];
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const rapidApiHost = process.env.RAPIDAPI_HOST;

    // --- PART 1: X (TWITTER) SCAN ---
    for (const handle of TWITTER_HANDLES) {
      try {
        const response = await fetch(
          `https://${rapidApiHost}/user-tweets?user=${handle}&count=8`,
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
          const tweet =
            entry?.content?.itemContent?.tweet_results?.result?.legacy;
          if (!tweet?.full_text || tweet.full_text.startsWith("RT @")) continue;

          const tweetDate = new Date(tweet.created_at);
          if (tweetDate.getTime() < ONE_HOUR_AGO) continue;

          const id = `x-${entry.entryId}`;
          const existing = await db
            .select()
            .from(signals)
            .where(eq(signals.id, id));
          if (existing.length > 0) continue;

          const aiData = await analyzeSignalWithAI(tweet.full_text, "");
          if (!aiData) continue;

          // FUTURE-PROOF: If tweet claims to be from future, cap at 'now'
          const finalDate = tweetDate > now ? now : tweetDate;

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
            timestamp: finalDate,
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
    const selectedFeeds = [...FEEDS]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    for (const url of selectedFeeds) {
      try {
        const feed = await parser.parseURL(`${url}?t=${Date.now()}`);
        for (const item of feed.items.slice(0, 3)) {
          const id = item.guid || item.link!;
          const pubDate = item.pubDate ? new Date(item.pubDate) : now;

          if (pubDate.getTime() < ONE_HOUR_AGO) continue;

          const existing = await db
            .select()
            .from(signals)
            .where(eq(signals.id, id));
          if (existing.length > 0) continue;

          const aiData = await analyzeSignalWithAI(
            item.title || "",
            item.contentSnippet || "",
          );
          if (!aiData) continue;

          // FUTURE-PROOF: If RSS claims to be from future, cap at 'now'
          const finalDate = pubDate > now ? now : pubDate;

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
            timestamp: finalDate,
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
  try {
    // 1. Calculate a safe "Yesterday" date
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 2. Perform the query
    const results = await db
      .select()
      .from(signals)
      .where(gt(signals.timestamp, twentyFourHoursAgo))
      .orderBy(desc(signals.timestamp))
      .limit(50);

    return results;
  } catch (error) {
    console.error(
      "⚠️ Database Query Failed. Falling back to simple fetch.",
      error,
    );

    // FALLBACK: If the 'where' filter is causing the timeout, just get the last 20
    return await db
      .select()
      .from(signals)
      .orderBy(desc(signals.timestamp))
      .limit(20);
  }
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
