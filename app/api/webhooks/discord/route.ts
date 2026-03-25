import { NextResponse } from "next/server";
import { processIntelRaw } from "@/lib/aggregator/factory";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.DISCORD_WEBHOOK_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json();
  let text = payload.content || "";
  if (payload.embeds?.[0])
    text +=
      " " + (payload.embeds[0].description || payload.embeds[0].title || "");

  // Label as "X" so the blue bird icon shows on the globe
  processIntelRaw({
    id: `discord-${Date.now()}`,
    text,
    source: "X",
  });

  return NextResponse.json({ status: "Queued" });
}
