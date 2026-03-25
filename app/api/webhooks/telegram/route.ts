import { NextResponse } from "next/server";
import { processIntelRaw } from "@/lib/aggregator/factory";

export async function POST(req: Request) {
  const secretToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const update = await req.json();
  const message = update.message || update.channel_post;
  if (!message || (!message.text && !message.caption))
    return NextResponse.json({ status: "OK" });

  const text = message.text || message.caption;

  // Send to Factory (Don't wait for it if you want the webhook to close instantly)
  processIntelRaw({
    id: `tg-${message.message_id}`,
    text,
    source: "Telegram",
    timestamp: new Date(message.date * 1000),
  });

  return NextResponse.json({ status: "Queued" });
}
