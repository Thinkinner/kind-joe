import { NextResponse } from "next/server";
import { getHistory } from "@/lib/domains/signals/actions/news-signal";

/** Public read — matches Kind Joe Watch (no auth). Do not expose secrets in signal payloads server-side. */
export async function GET() {
  const items = await getHistory();
  return NextResponse.json(items);
}
