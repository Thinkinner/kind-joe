import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const slackToken = process.env.KJ_SUPPORT_SLACK_BOT_TOKEN;
    const channelId = process.env.KJ_SUPPORT_SLACK_CHANNEL_ID;

    if (!slackToken || !channelId) {
      console.error("Slack token or channel ID not configured");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const text = `
📨 *New contact form submission*

*Name:* ${name}
*Email:* ${email}
*Subject:* ${subject || "N/A"}
*Message:*
${message}
    `.trim();

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${slackToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        text,
      }),
    });

    const data = await slackRes.json();

    if (!data.ok) {
      console.error("Slack API error:", data);
      return NextResponse.json(
        { error: "Failed to send message to Slack" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
