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
  console.log("-----------------------------------------");
  console.log("📡 [DISCORD WEBHOOK] Request Received");

  try {
    // 1. Check Authorization Header
    const authHeader = req.headers.get("Authorization");
    const expectedSecret = process.env.DISCORD_WEBHOOK_SECRET;

    console.log(`🔑 Auth Check: Received [${authHeader?.slice(0, 15)}...]`);

    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.error(
        "❌ [DISCORD WEBHOOK] Blocked: Unauthorized Secret Mismatch.",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    console.log("📦 Raw Payload:", JSON.stringify(payload).slice(0, 200));

    // 2. Extract Text (Handle both raw content and Bot Embeds)
    let text = payload.content || "";

    // If the Discord Bot uses embeds (common for Tweet-forwarders)
    if (payload.embeds && payload.embeds.length > 0) {
      const embedText =
        payload.embeds[0].description || payload.embeds[0].title || "";
      text = `${text} ${embedText}`.trim();
    }

    if (!text || text.length < 5) {
      console.log("⚠️ [DISCORD WEBHOOK] Ignored: Text is empty or too short.");
      return NextResponse.json({ status: "Ignored" });
    }

    console.log(`📱 Processing Intel: "${text.slice(0, 50)}..."`);

    // 3. AI Analysis
    console.log("🧠 Sending to Gemini AI...");
    const aiData = await analyzeSignalWithAI(text, "Source: X via Discord");

    if (!aiData) {
      console.error("❌ [DISCORD WEBHOOK] Gemini failed to return data.");
      return NextResponse.json({ status: "AI rejected" });
    }

    // 4. Format Signal
    const now = new Date();
    const newSignal = {
      id: `discord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      headline: aiData.intelHeadline,
      summary: aiData.intelSummary,
      source: "X" as const, // Force X icon for Discord-forwarded tweets
      category: aiData.category,
      lat: aiData.lat,
      lng: aiData.lng,
      city: aiData.city,
      country: aiData.country,
      impactScore: aiData.impactScore,
      tags: aiData.tags,
      timestamp: now,
    };

    // 5. Save and Broadcast
    const inserted = await db
      .insert(signals)
      .values(newSignal)
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      console.log("✅ [DISCORD WEBHOOK] Signal Saved. Broadcasting...");
      await pusher.trigger("aether-live", "new-signal", {
        ...newSignal,
        timestamp: newSignal.timestamp.getTime(),
      });
      return NextResponse.json({ status: "Success", signalId: newSignal.id });
    }

    console.log("⏩ Duplicate detected, skipping.");
    return NextResponse.json({ status: "Duplicate" });
  } catch (error) {
    console.error("❌ [DISCORD WEBHOOK] Fatal Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
