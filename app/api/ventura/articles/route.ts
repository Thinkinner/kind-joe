import { NextResponse } from "next/server";
import {
  listVenturaArticleSummariesPage,
} from "@/lib/feed/ventura-articles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hasPagination =
    searchParams.has("limit") || searchParams.has("offset");

  if (hasPagination) {
    const rawLimit = Number(searchParams.get("limit") ?? "20");
    const rawOffset = Number(searchParams.get("offset") ?? "0");
    const page = await listVenturaArticleSummariesPage({
      limit: Number.isFinite(rawLimit) ? rawLimit : 20,
      offset: Number.isFinite(rawOffset) ? rawOffset : 0,
    });
    return NextResponse.json(page);
  }

  const page = await listVenturaArticleSummariesPage({ limit: 50, offset: 0 });
  return NextResponse.json(page.items);
}
