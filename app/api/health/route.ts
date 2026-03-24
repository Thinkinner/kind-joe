import { db } from "@/db";
import { signals } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Get the absolute latest signal from the DB
  const latest = await db
    .select()
    .from(signals)
    .orderBy(desc(signals.timestamp))
    .limit(1);

  if (latest.length === 0) {
    return NextResponse.json({ status: "Empty Database", last_signal: null });
  }

  const lastSignalTime = new Date(latest[0].timestamp!);
  const minutesAgo = Math.floor(
    (Date.now() - lastSignalTime.getTime()) / 60000,
  );

  return NextResponse.json({
    status: "Online",
    last_signal_found: latest[0].headline,
    last_signal_time: lastSignalTime.toISOString(),
    minutes_ago: minutesAgo,
    healthy: minutesAgo < 60, // Healthy if we found something in the last hour
  });
}
