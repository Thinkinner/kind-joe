import { after } from "next/server";
import { postImmediateArticleComment } from "@/lib/automation/article-immediate-comment";
import { syncArticleEmbeddingByArticleId } from "@/lib/recommendations/article-related";

/**
 * Schedule embedding + optional AI comment after the HTTP response.
 * These Gemini calls used to block publish and made uploads feel slow.
 */
export function scheduleArticlePostPublishWork(params: {
  articleId: string;
  now?: Date;
  logLabel: string;
}): void {
  const { articleId, logLabel } = params;
  const now = params.now ?? new Date();

  after(async () => {
    try {
      await syncArticleEmbeddingByArticleId(articleId);
    } catch (error) {
      console.error(`[${logLabel}] embedding sync failed`, error);
    }

    try {
      await postImmediateArticleComment({ articleId, now });
    } catch (error) {
      console.error(`[${logLabel}] immediate comment failed`, error);
    }
  });
}
