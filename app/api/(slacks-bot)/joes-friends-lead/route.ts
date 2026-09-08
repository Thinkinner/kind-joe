import { NextResponse } from "next/server";

/** Joe's Friends leads go to their own Slack channel, not the support one. */
const DEFAULT_CHANNEL_ID = "C0C0HG4AHL0";

const MAX_LENGTHS = { name: 200, email: 320, message: 5000 } as const;

function readField(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = readField(body?.name, MAX_LENGTHS.name);
    const email = readField(body?.email, MAX_LENGTHS.email);
    const message = readField(body?.message, MAX_LENGTHS.message);

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const slackToken =
      process.env.KJ_JOES_FRIENDS_SLACK_BOT_TOKEN?.trim() ||
      process.env.KJ_SUPPORT_SLACK_BOT_TOKEN?.trim();
    const channelId =
      process.env.KJ_JOES_FRIENDS_SLACK_CHANNEL_ID?.trim() ||
      DEFAULT_CHANNEL_ID;

    if (!slackToken) {
      console.error("joes_friends_lead_missing_slack_token");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const text = [
      "🎬 *New Joe's Friends lead* — Book a Call",
      "",
      `*Name:* ${name}`,
      `*Email:* ${email}`,
      "*What they need:*",
      message,
    ].join("\n");

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({ channel: channelId, text }),
    });

    const data = await slackRes.json();

    if (!data.ok) {
      console.error("joes_friends_lead_slack_error", data?.error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("joes_friends_lead_failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
