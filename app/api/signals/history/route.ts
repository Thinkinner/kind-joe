import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { getHistory } from "@/lib/domains/signals/actions/news-signal";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await getHistory();
  return NextResponse.json(items);
}
