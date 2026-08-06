import { NextResponse } from "next/server";
import { extractXUrlsFromText } from "@/lib/slack/extract-x-urls";
import { verifySlackRequestSignature } from "@/lib/slack/verify";
import { assignSlackLink } from "@/lib/admin/link-assignments";

type SlackEventPayload = {
  type?: string;
  challenge?: string;
  event?: {
    type?: string;
    subtype?: string;
    bot_id?: string;
    user?: string;
    channel?: string;
    ts?: string;
    text?: string;
    thread_ts?: string;
  };
};

async function postSlackReply(input: {
  token: string;
  channel: string;
  threadTs: string;
  text: string;
}) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      channel: input.channel,
      thread_ts: input.threadTs,
      text: input.text,
      link_names: true,
    }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!data.ok) {
    console.error("Slack chat.postMessage failed:", data);
  }
  return data;
}

export async function POST(req: Request) {
  const signingSecret = process.env.KJ_LINK_SLACK_SIGNING_SECRET;
  const botToken = process.env.KJ_SUPPORT_SLACK_BOT_TOKEN;
  const assignChannelId = process.env.KJ_LINK_ASSIGN_SLACK_CHANNEL_ID;

  const rawBody = await req.text();
  const signature = req.headers.get("x-slack-signature");
  const timestamp = req.headers.get("x-slack-request-timestamp");

  if (!signingSecret) {
    console.error("KJ_LINK_SLACK_SIGNING_SECRET not configured");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const valid = verifySlackRequestSignature({
    signingSecret,
    signature,
    timestamp,
    rawBody,
  });
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: SlackEventPayload;
  try {
    payload = JSON.parse(rawBody) as SlackEventPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback" || !payload.event) {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;

  // Acknowledge quickly for retries; process link assign inline (usually fast).
  if (event.type !== "message") {
    return NextResponse.json({ ok: true });
  }

  // Ignore bot messages, message edits, joins, etc.
  if (event.subtype || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  if (!assignChannelId || event.channel !== assignChannelId) {
    return NextResponse.json({ ok: true });
  }

  if (!botToken) {
    console.error("KJ_SUPPORT_SLACK_BOT_TOKEN not configured");
    return NextResponse.json({ ok: true });
  }

  const text = event.text ?? "";
  const urls = extractXUrlsFromText(text);
  if (!urls.length || !event.ts || !event.channel) {
    return NextResponse.json({ ok: true });
  }

  for (const url of urls) {
    const result = await assignSlackLink({
      url,
      slackChannelId: event.channel,
      slackMessageTs: event.ts,
      postedBySlackUserId: event.user ?? null,
    });

    if (!result.ok) {
      if (result.reason === "no_available_staff") {
        await postSlackReply({
          token: botToken,
          channel: event.channel,
          threadTs: event.ts,
          text: `No one is checked in as working on Kind Joe today — could not auto-assign ${url}`,
        });
      }
      continue;
    }

    const mention = result.slackUserId
      ? `<@${result.slackUserId}>`
      : `*${result.assigneeName}*`;

    await postSlackReply({
      token: botToken,
      channel: event.channel,
      threadTs: event.ts,
      text: `${mention} you're assigned this link:\n${url}`,
    });
  }

  return NextResponse.json({ ok: true });
}
