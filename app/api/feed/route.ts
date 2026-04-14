import { NextResponse } from "next/server";
import { getServerSession, type AuthAppUser } from "@/lib/auth/server";
import { listUnifiedFeed } from "@/lib/feed/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const offsetRaw = searchParams.get("offset");
    const kindRaw = searchParams.get("kind");
    const categoryRaw = searchParams.get("category");
    const kind =
      kindRaw === "prediction" || kindRaw === "all"
        ? kindRaw
        : "prediction";
    const category = categoryRaw?.trim() || undefined;
    const limit = Number(limitRaw ?? "20");
    const offset = Number(offsetRaw ?? "0");

    const session = await getServerSession();
    const user = session?.user as AuthAppUser | undefined;
    const viewerId = user?.id ?? null;

    const result = await listUnifiedFeed({
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
      viewerId,
      kind,
      category,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("feed_list_failed", err);
    return NextResponse.json(
      { error: "Could not load feed." },
      { status: 500 },
    );
  }
}
