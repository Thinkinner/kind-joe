import type { Metadata } from "next";
import Link from "next/link";
import { PredictionMarketsBoard } from "@/components/predictions/prediction-markets-board";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { listPredictionMarkets } from "@/lib/predictions/queries";

export const metadata: Metadata = {
  title: "News Predictions",
  description: "Vote on trending news predictions.",
};

export default async function PredictionsPage() {
  const session = await getServerSession();
  const user = session?.user as AuthAppUser | undefined;
  const viewerId = user?.id ?? null;
  const markets = await listPredictionMarkets({
    limit: 60,
    viewerId,
  });

  return (
    <>
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
            Kind Joe News Predictions
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Vote on what happens next
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Browse community news predictions and vote on each topic. You can
            change your vote while a topic is open.
          </p>
          <div className="mt-4 text-sm text-slate-600">
            Try the new{" "}
            <Link href="/feed" className="font-semibold underline underline-offset-4">
              endless prediction feed
            </Link>
            .{" "}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Want to suggest a market?{" "}
            <Link href="/contact" className="font-semibold underline underline-offset-4">
              Contact the team
            </Link>
            .
          </div>
        </section>

        <PredictionMarketsBoard initialMarkets={markets} nextPath="/predictions" />
      </main>
    </>
  );
}
