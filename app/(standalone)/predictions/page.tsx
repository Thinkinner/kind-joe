import type { Metadata } from "next";
import { PredictionFeed } from "@/components/predictions/prediction-feed";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { listPredictionMarkets } from "@/lib/predictions/queries";

export const metadata: Metadata = {
  title: "News Forecast Board",
  description: "Vote on what happens next in the news.",
};

export default async function PredictionsPage() {
  const session = await getServerSession();
  const user = session?.user as AuthAppUser | undefined;
  const viewerId = user?.id ?? null;
  const markets = await listPredictionMarkets({
    limit: 60,
    viewerId,
  });

  return <PredictionFeed initialMarkets={markets} />;
}
