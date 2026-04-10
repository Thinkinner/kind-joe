"use server";

import { db } from "@/db";
import { articlePageviews } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

type RawTrafficRow = {
  trafficSource: string | null;
  utmSource: string | null;
  referrer: string | null;
  views: number;
};

type TrafficDetailRow = {
  source: string;
  views: number;
  share: number;
};

function toHost(referrer?: string | null): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeTrafficSource(input: {
  trafficSource?: string | null;
  utmSource?: string | null;
  referrer?: string | null;
}): string {
  const joined = [input.trafficSource, input.utmSource, toHost(input.referrer)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim();

  if (!joined || joined.includes("direct")) return "Direct";
  if (
    joined.includes("google") ||
    joined.includes("bing") ||
    joined.includes("duckduckgo") ||
    joined.includes("search")
  ) {
    return "Search";
  }
  if (
    joined.includes("instagram") ||
    joined === "ig" ||
    joined.includes("instagr.am")
  ) {
    return "Instagram";
  }
  if (joined.includes("facebook") || joined.includes("fb.com") || joined === "fb") {
    return "Facebook";
  }
  if (
    joined.includes("twitter") ||
    joined.includes("x.com") ||
    joined === "x"
  ) {
    return "X / Twitter";
  }
  if (joined.includes("linkedin")) return "LinkedIn";
  if (joined.includes("reddit")) return "Reddit";
  if (joined.includes("youtube")) return "YouTube";
  if (joined.includes("tiktok")) return "TikTok";
  if (joined.includes("email") || joined.includes("mail")) return "Email";
  if (joined.includes("news") || joined.includes("newsletter")) return "Newsletter";
  if (joined.includes("referral") || !!toHost(input.referrer)) return "Other Referral";
  return "Other";
}

export async function getArticleTrafficDetails(articleId: string) {
  try {
    const stats = await db
      .select({
        trafficSource: articlePageviews.trafficSource,
        utmSource: articlePageviews.utmSource,
        referrer: articlePageviews.referrer,
        views: sql<number>`CAST(COUNT(${articlePageviews.id}) AS INT)`,
      })
      .from(articlePageviews)
      .where(eq(articlePageviews.articleId, articleId))
      .groupBy(
        articlePageviews.trafficSource,
        articlePageviews.utmSource,
        articlePageviews.referrer,
      )
      .orderBy(desc(sql`COUNT(${articlePageviews.id})`));
    const grouped = new Map<string, number>();
    for (const row of stats as RawTrafficRow[]) {
      const source = normalizeTrafficSource(row);
      grouped.set(source, (grouped.get(source) ?? 0) + (row.views ?? 0));
    }
    const total = Array.from(grouped.values()).reduce((sum, v) => sum + v, 0);
    const result: TrafficDetailRow[] = Array.from(grouped.entries())
      .map(([source, views]) => ({
        source,
        views,
        share: total > 0 ? (views / total) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views);

    return result;
  } catch (error) {
    console.error("getArticleTrafficDetails:", error);
    return [];
  }
}
