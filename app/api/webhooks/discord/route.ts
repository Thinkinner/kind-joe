import { NextResponse } from "next/server";
import { processIntelRaw } from "@/lib/aggregator/factory";
import {
  coerceDiscordIntelPayload,
  collectBridgeSourceUrlCandidates,
  intelSourceFromStoryUrl,
  resolveDiscordWebhookSourceUrl,
} from "@/lib/webhooks/discord-intel-source";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.DISCORD_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const discordShape = coerceDiscordIntelPayload(payload);
    let text = discordShape.content || "";
    for (const raw of discordShape.embeds ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as { title?: unknown; description?: unknown };
      if (typeof e.title === "string" && e.title.trim()) text += " " + e.title;
      if (typeof e.description === "string" && e.description.trim()) {
        text += " " + e.description;
      }
    }

    const body = payload as Record<string, unknown>;
    const bridgeHints = collectBridgeSourceUrlCandidates(payload);
    const sourceUrl = resolveDiscordWebhookSourceUrl(payload);

    console.log(
      `[discord-webhook] source_url: ${sourceUrl ?? "(none)"} | bridge_hints=${bridgeHints.length} top_level_keys=${Object.keys(body).slice(0, 12).join(",")}`,
    );

    await processIntelRaw({
      id: `discord-${Date.now()}`,
      text: text,
      source: intelSourceFromStoryUrl(sourceUrl),
      sourceUrl,
    });

    return NextResponse.json({ status: "Success" });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
