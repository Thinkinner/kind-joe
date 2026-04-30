import { NextResponse } from "next/server";
import { listVenturaArticleSummaries } from "@/lib/feed/ventura-articles";

export const revalidate = 60;

export async function GET() {
  const articles = await listVenturaArticleSummaries();
  return NextResponse.json(articles);
}
