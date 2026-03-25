import { NextResponse } from "next/server";
import { processIntelRaw } from "@/lib/aggregator/factory";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.DISCORD_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    let text = payload.content || "";
    if (payload.embeds?.[0])
      text += " " + (payload.embeds[0].description || "");

    // 🚨 🚨 THE MOST IMPORTANT LINE 🚨 🚨
    // We MUST await this so Vercel doesn't kill the process
    await processIntelRaw({
      id: `discord-${Date.now()}`,
      text: text,
      source: "X",
    });

    return NextResponse.json({ status: "Success" });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
