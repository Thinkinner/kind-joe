import { syncRealTimeNews } from "@/lib/aggregator";
import { NextResponse } from "next/server";

// This tells Next.js not to cache this route
export const dynamic = "force-dynamic";
/** Match vercel.json; allows up to 12 Gemini-backed items per run. */
export const maxDuration = 120;

export async function GET(request: Request) {
  // 1. Security check (Optional but recommended)
  // Only allow Vercel's Cron service or your secret key to hit this
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log("🕒 Cron Job Started: Syncing Real-Time News...");
    
    // 2. Run the Aggregator (RSS -> Gemini -> DB -> Pusher)
    const newSignals = await syncRealTimeNews();

    return NextResponse.json({ 
      success: true, 
      processed: newSignals.length,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error("❌ Cron Job Failed:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}