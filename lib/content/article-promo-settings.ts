import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articlePromoSettings } from "@/db/schema";
import { ARTICLE_BANNER_VIDEO_URL } from "@/lib/media/youtube";
import type { ArticlePromoMedia } from "@/lib/content/back-taxes-cta";

const SETTINGS_ID = 1;

export const DEFAULT_ARTICLE_PROMO: Required<ArticlePromoMedia> = {
  videoUrl: ARTICLE_BANNER_VIDEO_URL,
  bannerImageUrl: null,
};

function normalize(row: {
  videoUrl: string;
  bannerImageUrl: string | null;
}): Required<ArticlePromoMedia> {
  return {
    videoUrl: row.videoUrl.trim() || DEFAULT_ARTICLE_PROMO.videoUrl,
    bannerImageUrl: row.bannerImageUrl?.trim() || null,
  };
}

export const getArticlePromoSettings = cache(
  async (): Promise<Required<ArticlePromoMedia>> => {
    try {
      const [row] = await db
        .select({
          videoUrl: articlePromoSettings.videoUrl,
          bannerImageUrl: articlePromoSettings.bannerImageUrl,
        })
        .from(articlePromoSettings)
        .where(eq(articlePromoSettings.id, SETTINGS_ID))
        .limit(1);

      if (!row) return DEFAULT_ARTICLE_PROMO;
      return normalize(row);
    } catch (error) {
      console.error("article promo settings unavailable", error);
      return DEFAULT_ARTICLE_PROMO;
    }
  },
);

export async function saveArticlePromoSettings(
  input: ArticlePromoMedia,
  updatedByUserId: string | null,
): Promise<Required<ArticlePromoMedia>> {
  const videoUrl = input.videoUrl?.trim() || DEFAULT_ARTICLE_PROMO.videoUrl;
  const bannerImageUrl = input.bannerImageUrl?.trim() || null;

  const [saved] = await db
    .insert(articlePromoSettings)
    .values({
      id: SETTINGS_ID,
      videoUrl,
      bannerImageUrl,
      updatedAt: new Date(),
      updatedByUserId,
    })
    .onConflictDoUpdate({
      target: articlePromoSettings.id,
      set: {
        videoUrl,
        bannerImageUrl,
        updatedAt: new Date(),
        updatedByUserId,
      },
    })
    .returning({
      videoUrl: articlePromoSettings.videoUrl,
      bannerImageUrl: articlePromoSettings.bannerImageUrl,
    });

  return saved ? normalize(saved) : { videoUrl, bannerImageUrl };
}
