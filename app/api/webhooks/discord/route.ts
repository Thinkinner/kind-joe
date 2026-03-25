import { NextResponse } from "next/server";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { analyzeSignalWithAI } from "@/lib/aggregator/ai";
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    // 1. Security Check: Ensure the request has your secret password
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.DISCORD_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();

    // Discord bots usually put the tweet text in 'content' or inside an 'embed'
    let text = payload.content || "";
    if (payload.embeds && payload.embeds.length > 0) {
      text += " " + (payload.embeds[0].description || "");
    }

    if (!text || text.length < 10) {
      return NextResponse.json({ status: "Ignored (Too short)" });
    }

    console.log(`📱 INSTANT DISCORD/X INTEL: ${text.slice(0, 50)}...`);

    // 2. Process with Gemini AI
    const aiData = await analyzeSignalWithAI(text, "Source: X via Discord");
    if (!aiData) return NextResponse.json({ status: "AI rejected" });

    // 3. Format the Signal
    const now = new Date();
    const newSignal = {
      id: `discord-${Date.now()}`, // Generate a unique ID
      headline: aiData.intelHeadline,
      summary: aiData.intelSummary,
      source: "X" as const, // We label it X so the UI shows the Twitter Bird icon!
      category: aiData.category,
      lat: aiData.lat,
      lng: aiData.lng,
      city: aiData.city,
      country: aiData.country,
      impactScore: aiData.impactScore,
      tags: aiData.tags,
      timestamp: now,
    };

    // 4. Save to DB
    const inserted = await db
      .insert(signals)
      .values(newSignal)
      .onConflictDoNothing()
      .returning();

    // 5. Broadcast INSTANTLY to Globe
    if (inserted.length > 0) {
      await pusher.trigger("aether-live", "new-signal", {
        ...newSignal,
        timestamp: newSignal.timestamp.getTime(),
      });
    }

    return NextResponse.json({ status: "Success" });
  } catch (error) {
    console.error("Discord Webhook Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
