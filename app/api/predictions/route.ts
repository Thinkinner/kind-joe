import { NextResponse } from "next/server";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { listPredictionMarkets } from "@/lib/predictions/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusRaw = searchParams.get("status");
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const limit = Number(limitRaw ?? "20");
    const offset = Number(offsetRaw ?? "0");

    const status =
      statusRaw === "open" || statusRaw === "locked" || statusRaw === "resolved"
        ? statusRaw
        : undefined;

    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id ?? null;

    const markets = await listPredictionMarkets({
      status,
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
      viewerId,
    });
    return NextResponse.json({
      markets,
      hasMore: markets.length === Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 20)),
      nextOffset: (Number.isFinite(offset) ? Math.max(0, offset) : 0) + markets.length,
    });
  } catch (err) {
    console.error("predictions_list_failed", err);
    return NextResponse.json(
      { error: "Could not load prediction markets." },
      { status: 500 },
    );
  }
}
