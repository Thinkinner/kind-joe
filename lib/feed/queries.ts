import type { PredictionMarketView } from "@/lib/predictions/queries";
import { listPredictionMarkets } from "@/lib/predictions/queries";

export type UnifiedFeedItem = {
  type: "prediction";
  id: string;
  createdAt: string;
  prediction: PredictionMarketView;
};

export async function listUnifiedFeed(params?: {
  limit?: number;
  offset?: number;
  viewerId?: string | null;
  kind?: "all" | "prediction";
  category?: string;
}): Promise<{ items: UnifiedFeedItem[]; hasMore: boolean; nextOffset: number }> {
  const limit = Math.max(1, Math.min(100, params?.limit ?? 20));
  const offset = Math.max(0, Math.min(10000, params?.offset ?? 0));
  const markets = await listPredictionMarkets({
    limit,
    offset,
    viewerId: params?.viewerId,
    category: params?.category,
  });
  const items: UnifiedFeedItem[] = markets.map((m) => ({
    type: "prediction",
    id: `prediction:${m.id}`,
    createdAt: m.createdAt,
    prediction: m,
  }));
  return {
    items,
    hasMore: items.length === limit,
    nextOffset: offset + items.length,
  };
}
