import { NextResponse } from "next/server";
import { extractXUrlsFromSlackEvent } from "@/lib/slack/extract-x-urls";
import { assignSlackLink } from "@/lib/admin/link-assignments";
import {
  getSlackLinkAssignChannelId,
  getSlackWorkChannelId,
} from "@/lib/admin/slack-link-assign-settings";
import { recordStaffSlackContentActivity } from "@/lib/admin/idle-nudge";

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
    attachments?: Array<{
      original_url?: string;
      from_url?: string;
      title_link?: string;
      text?: string;
    }>;
    blocks?: unknown;
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
  const botToken =
    process.env.KJ_LINK_ASSIGN_SLACK_BOT_TOKEN?.trim() ||
    process.env.KJ_SUPPORT_SLACK_BOT_TOKEN?.trim();

  const rawBody = await req.text();
  console.info("[slack-events] incoming", {
    bytes: rawBody.length,
    hasLinkAssignToken: Boolean(process.env.KJ_LINK_ASSIGN_SLACK_BOT_TOKEN?.trim()),
    hasSupportToken: Boolean(process.env.KJ_SUPPORT_SLACK_BOT_TOKEN?.trim()),
  });

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

  if (event.type !== "message") {
    return NextResponse.json({ ok: true });
  }

  // Ignore bot messages, message edits, joins, etc.
  if (event.subtype || event.bot_id) {
    return NextResponse.json({ ok: true });
  }

  const [assignChannelId, workChannelId] = await Promise.all([
    getSlackLinkAssignChannelId(),
    getSlackWorkChannelId(),
  ]);

  if (!assignChannelId && !workChannelId) {
    console.warn(
      "[slack-events] no channels configured in Admin → Slack channels",
    );
    return NextResponse.json({ ok: true });
  }

  const inAssignChannel = Boolean(
    assignChannelId && event.channel === assignChannelId,
  );
  const inWorkChannel = Boolean(
    workChannelId && event.channel === workChannelId,
  );

  if (!inAssignChannel && !inWorkChannel) {
    console.info("[slack-events] ignore other channel", {
      got: event.channel,
      assign: assignChannelId || null,
      work: workChannelId || null,
    });
    return NextResponse.json({ ok: true });
  }

  // Work channel: any human message counts as content activity for idle tracking.
  if (inWorkChannel && event.user) {
    try {
      await recordStaffSlackContentActivity(event.user);
    } catch (error) {
      console.error("[slack-events] content activity update failed:", error);
    }
  }

  // Assign channel: auto-assign X/Twitter links.
  if (!inAssignChannel) {
    return NextResponse.json({ ok: true });
  }

  if (!botToken) {
    console.error(
      "[slack-events] set KJ_LINK_ASSIGN_SLACK_BOT_TOKEN (or KJ_SUPPORT_SLACK_BOT_TOKEN) on this deploy",
    );
    return NextResponse.json({ error: "bot_token_missing" }, { status: 500 });
  }

  const urls = extractXUrlsFromSlackEvent(event);
  if (!urls.length || !event.ts || !event.channel) {
    console.info("[slack-events] no X urls in message", {
      textPreview: (event.text ?? "").slice(0, 120),
      hasAttachments: Boolean(event.attachments?.length),
    });
    return NextResponse.json({ ok: true });
  }

  console.info("[slack-events] assigning", {
    channel: event.channel,
    urls,
  });

  for (const url of urls) {
    const result = await assignSlackLink({
      url,
      slackChannelId: event.channel,
      slackMessageTs: event.ts,
      postedBySlackUserId: event.user ?? null,
    });

    if (!result.ok) {
      console.warn("[slack-events] assign failed", result.reason, url);
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
