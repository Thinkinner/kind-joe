import { NextRequest, NextResponse } from "next/server";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { getPredictionMarketBySlug } from "@/lib/predictions/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id ?? null;

    const market = await getPredictionMarketBySlug(slug, viewerId);
    if (!market) {
      return NextResponse.json(
        { error: "Prediction market not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ market });
  } catch (err) {
    console.error("prediction_detail_failed", err);
    return NextResponse.json(
      { error: "Could not load prediction market." },
      { status: 500 },
    );
  }
}
