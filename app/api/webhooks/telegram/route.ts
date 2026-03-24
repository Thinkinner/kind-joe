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
  console.log("🔔 [WEBHOOK] Incoming request from Telegram...");

  try {
    // 1. Security Check: Ensure it's actually Telegram calling this
    const secretToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");

    if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      console.error("❌ [WEBHOOK] Unauthorized! Secret token mismatch.");
      console.log(`   Expected: ${process.env.TELEGRAM_WEBHOOK_SECRET}`);
      console.log(`   Received: ${secretToken}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await req.json();

    // 2. Extract the message (Works for direct messages or channel posts)
    const message = update.message || update.channel_post;

    if (!message) {
      console.log("⚠️ [WEBHOOK] Ignored: No message body found in payload.");
      return NextResponse.json({ status: "Ignored (No message)" });
    }

    // Extract text (could be 'text' or 'caption' if it's an image/video)
    const text = message.text || message.caption;

    if (!text || text.length < 10) {
      console.log("⚠️ [WEBHOOK] Ignored: Text too short or missing.");
      return NextResponse.json({ status: "Ignored (Too short)" });
    }

    console.log(`📱 [WEBHOOK] Processing: "${text.slice(0, 50)}..."`);

    // 3. Process with Gemini AI
    console.log("🧠 [WEBHOOK] Sending to Gemini AI...");
    const aiData = await analyzeSignalWithAI(text, "Source: Telegram OSINT");

    if (!aiData) {
      console.error("❌ [WEBHOOK] AI Analysis failed or returned null.");
      return NextResponse.json({ status: "AI rejected" });
    }

    // 4. Format the Signal
    // Telegram dates are Unix seconds, so multiply by 1000 for JS milliseconds
    const signalTime = new Date(message.date * 1000);
    const now = new Date();
    const validatedDate = signalTime > now ? now : signalTime;

    const newSignal = {
      id: `tg-${message.message_id}`,
      headline: aiData.intelHeadline,
      summary: aiData.intelSummary,
      source: "Telegram" as const, // Maps to your SOURCE_ICONS!
      category: aiData.category,
      lat: aiData.lat,
      lng: aiData.lng,
      city: aiData.city,
      country: aiData.country,
      impactScore: aiData.impactScore,
      tags: aiData.tags,
      timestamp: validatedDate,
    };

    // 5. Save to DB
    const inserted = await db
      .insert(signals)
      .values(newSignal)
      .onConflictDoNothing()
      .returning();

    // 6. Broadcast INSTANTLY to Globe
    if (inserted.length > 0) {
      console.log(`✅ [WEBHOOK] Success! Broadcasting: ${newSignal.headline}`);

      await pusher.trigger("aether-live", "new-signal", {
        ...newSignal,
        timestamp: newSignal.timestamp.getTime(),
      });

      // Send OS Push Notification
      await sendBeamsNotification(newSignal.headline, newSignal.city);
    } else {
      console.log("⏩ [WEBHOOK] Duplicate ignored (already in DB).");
    }

    return NextResponse.json({ status: "Success" });
  } catch (error) {
    console.error("❌ [WEBHOOK] Fatal Server Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// Helper for Push Notifications
async function sendBeamsNotification(headline: string, city: string) {
  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;
  if (!instanceId || !secretKey) return;

  try {
    await fetch(
      `https://${instanceId}.pushnotifications.pusher.com/publish_api/v1/instances/${instanceId}/publishes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
          interests: ["hello"],
          web: {
            notification: {
              title: "🚨 Telegram OSINT",
              body: `${headline} (${city})`,
              deep_link:
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            },
          },
        }),
      },
    );
  } catch (err) {
    console.error("Beams Error:", err);
  }
}
