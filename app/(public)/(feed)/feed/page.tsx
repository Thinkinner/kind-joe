import type { Metadata } from "next";
import { PredictionFeed } from "@/components/predictions/prediction-feed";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { listPredictionMarkets } from "@/lib/predictions/queries";

export const metadata: Metadata = {
  title: "Prediction Feed",
  description: "Infinite feed of news prediction polls.",
};

export default async function PredictionFeedPage() {
  const session = await getServerSession();
  const user = session?.user as AuthAppUser | undefined;
  const viewerId = user?.id ?? null;
  const markets = await listPredictionMarkets({
    limit: 10,
    offset: 0,
    viewerId,
  });

  return (
    <PredictionFeed initialMarkets={markets} />
  );
}

