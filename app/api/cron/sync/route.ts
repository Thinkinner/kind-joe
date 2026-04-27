import { syncRealTimeNews } from "@/lib/aggregator";
import { processScheduledArticleAutoComments } from "@/lib/automation/article-auto-comments";
import { NextResponse } from "next/server";

// This tells Next.js not to cache this route
export const dynamic = "force-dynamic";
/** Cron hook; RSS ingest is disabled when no feeds are configured. */
export const maxDuration = 120;

export async function GET(request: Request) {
  // 1. Security check (Optional but recommended)
  // Only allow Vercel's Cron service or your secret key to hit this
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log("🕒 Cron: RSS sync (no feeds configured)");
    const newSignals = await syncRealTimeNews();
    const autoComments = await processScheduledArticleAutoComments({
      now: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      processed: newSignals.length,
      autoComments,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("❌ Cron Job Failed:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}