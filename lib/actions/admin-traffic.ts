"use server";

import { db } from "@/db";
import { articlePageviews } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function getArticleTrafficDetails(articleId: string) {
  try {
    const stats = await db
      .select({
        source: sql<string>`COALESCE(${articlePageviews.trafficSource}, 'Direct / Unknown')`,
        views: sql<number>`CAST(COUNT(${articlePageviews.id}) AS INT)`,
      })
      .from(articlePageviews)
      .where(eq(articlePageviews.articleId, articleId))
      .groupBy(sql`COALESCE(${articlePageviews.trafficSource}, 'Direct / Unknown')`)
      .orderBy(desc(sql`COUNT(${articlePageviews.id})`));

    return stats;
  } catch (error) {
    console.error("getArticleTrafficDetails:", error);
    return [];
  }
}
