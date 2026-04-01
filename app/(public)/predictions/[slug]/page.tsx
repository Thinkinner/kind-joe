import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PredictionMarketDetailClient } from "@/components/predictions/prediction-market-detail-client";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { getPredictionMarketBySlug } from "@/lib/predictions/queries";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const market = await getPredictionMarketBySlug(slug, null);
  if (!market) {
    return { title: "Prediction not found" };
  }
  return {
    title: `${market.title} · News Predictions`,
    description: market.description ?? `Vote and discuss: ${market.title}`,
  };
}

export default async function PredictionMarketPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getServerSession();
  const user = session?.user as AuthAppUser | undefined;
  const viewerId = user?.id ?? null;

  const market = await getPredictionMarketBySlug(slug, viewerId);
  if (!market) {
    notFound();
  }

  const nextPath = `/predictions/${slug}`;

  return (
    <PredictionMarketDetailClient
      initialMarket={market}
      slug={slug}
      nextPath={nextPath}
    />
  );
}
