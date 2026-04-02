import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  type Message,
  type APIEmbed,
} from "discord.js";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const KINDJOE_WEBHOOK_URL = process.env.KINDJOE_WEBHOOK_URL;
const KINDJOE_WEBHOOK_SECRET = process.env.KINDJOE_WEBHOOK_SECRET;

const REQUIRE_CHANNEL_RULES = process.env.REQUIRE_CHANNEL_RULES === "true";
const DEBUG_RAW_DISCORD_EVENT = process.env.DEBUG_RAW_DISCORD_EVENT === "true";
const URL_EXPAND_TIMEOUT_MS = Number.parseInt(
  process.env.URL_EXPAND_TIMEOUT_MS ?? "7000",
  10,
);
const DB_RULES_REFRESH_MS = Number.parseInt(
  process.env.DB_RULES_REFRESH_MS ?? "30000",
  10,
);

const DISCORD_ALLOWED_CHANNEL_IDS = new Set(
  (process.env.DISCORD_ALLOWED_CHANNEL_IDS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
);

const HTTP_URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const X_STATUS_RE =
  /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/i;

function shortLog(text: string, max = 220): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function parseUrlsFromText(text: string): string[] {
  const urls = text.match(HTTP_URL_RE) ?? [];
  return urls.map((u) => u.replace(/[),.;!?]+$/g, ""));
}

function canonicalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (!/^https?:$/i.test(u.protocol)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

async function maybeExpandUrl(url: string): Promise<string> {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const shouldExpand =
      host === "t.co" ||
      host.endsWith(".t.co") ||
      host === "bit.ly" ||
      host.endsWith(".bit.ly") ||
      host === "tinyurl.com" ||
      host.endsWith(".tinyurl.com");
    if (!shouldExpand) return url;

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), URL_EXPAND_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctl.signal,
      });
      return res.url || url;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return url;
  }
}

function embedChunks(embed: APIEmbed): string[] {
  const chunks: string[] = [];
  if (embed.url) chunks.push(embed.url);
  if (embed.title) chunks.push(embed.title);
  if (embed.description) chunks.push(embed.description);
  if (embed.footer?.text) chunks.push(embed.footer.text);
  if (embed.author?.name) chunks.push(embed.author.name);
  if (embed.author?.url) chunks.push(embed.author.url);
  for (const field of embed.fields ?? []) {
    if (field.name) chunks.push(field.name);
    if (field.value) chunks.push(field.value);
  }
  return chunks;
}

function cleanBodyText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildNormalizedPayload(message: Message) {
  const chunks: string[] = [];
  if (message.content?.trim()) chunks.push(message.content.trim());
  for (const embed of message.embeds) {
    chunks.push(...embedChunks(embed.toJSON()));
  }
  for (const attachment of message.attachments.values()) {
    if (attachment.url) chunks.push(attachment.url);
  }

  const candidateUrls = new Set<string>();
  for (const c of chunks) {
    for (const rawUrl of parseUrlsFromText(c)) {
      const canon = canonicalizeUrl(rawUrl);
      if (canon) candidateUrls.add(canon);
    }
  }

  const expanded = await Promise.all(
    [...candidateUrls].slice(0, 8).map((u) => maybeExpandUrl(u)),
  );
  for (const e of expanded) {
    const canon = canonicalizeUrl(e);
    if (canon) candidateUrls.add(canon);
  }

  let sourceUrl: string | null = null;
  let tweetId: string | null = null;
  let tweetUser: string | null = null;

  for (const url of candidateUrls) {
    const m = url.match(X_STATUS_RE);
    if (m) {
      sourceUrl = url;
      tweetUser = m[1] ?? null;
      tweetId = m[2] ?? null;
      break;
    }
  }
  if (!sourceUrl) {
    sourceUrl = [...candidateUrls][0] ?? null;
  }

  const displayName =
    message.member?.displayName?.trim() ||
    message.author.globalName?.trim() ||
    message.author.displayName?.trim() ||
    message.author.username;
  const sourceHandle = tweetUser
    ? `@${tweetUser.replace(/^@+/, "")}`
    : `@${message.author.username.replace(/^@+/, "")}`;

  const bodyText = cleanBodyText(
    chunks
      .filter((c) => !/^https?:\/\//i.test(c.trim()))
      .join(" "),
  );

  const text =
    bodyText ||
    sourceUrl ||
    "Signal received from Discord";

  return {
    id: tweetId ? `x-${tweetId}` : `discord-${message.id}`,
    text,
    source: "X",
    url: sourceUrl,
    twitterUrl: sourceUrl,
    sourceUrl,
    timestamp: new Date(message.createdTimestamp).toISOString(),
    createdAt: new Date(message.createdTimestamp).toISOString(),
    enriched: {
      canonicalSourceUrl: sourceUrl,
      sourceDisplayName: displayName,
      sourceHandle,
      sourceIconKey: "x",
      sourceAvatarUrl: message.author.displayAvatarURL({
        extension: "png",
        size: 256,
      }),
      sourceVerified: false,
      trustTier: "medium",
      trustScore: 60,
      mediaUrls: [],
    },
    meta: {
      messageId: message.id,
      guildId: message.guildId ?? undefined,
      channelId: message.channelId,
      channelName:
        "name" in message.channel && typeof message.channel.name === "string"
          ? message.channel.name
          : undefined,
      receivedAt: new Date().toISOString(),
    },
  };
}

async function postToIngestEndpoint(payload: Record<string, unknown>) {
  if (!KINDJOE_WEBHOOK_URL) {
    throw new Error("KINDJOE_WEBHOOK_URL is required");
  }
  const headers: HeadersInit = { "content-type": "application/json" };
  if (KINDJOE_WEBHOOK_SECRET?.trim()) {
    headers.authorization = `Bearer ${KINDJOE_WEBHOOK_SECRET.trim()}`;
  }

  const res = await fetch(KINDJOE_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(
      `Webhook ${res.status}: ${shortLog(text || "non-2xx response", 300)}`,
    );
  }
}

function isAllowedMessage(message: Message): boolean {
  if (message.author.bot) return false;
  if (DISCORD_ALLOWED_CHANNEL_IDS.size === 0) return !REQUIRE_CHANNEL_RULES;
  return DISCORD_ALLOWED_CHANNEL_IDS.has(message.channelId);
}

async function main() {
  if (!DISCORD_BOT_TOKEN) {
    throw new Error("DISCORD_BOT_TOKEN is required");
  }
  if (!KINDJOE_WEBHOOK_URL) {
    throw new Error("KINDJOE_WEBHOOK_URL is required");
  }

  console.log("[discord-worker] starting listener");
  console.log(
    `[discord-worker] requireChannelRules=${REQUIRE_CHANNEL_RULES} channelRules=${DISCORD_ALLOWED_CHANNEL_IDS.size} refreshMs=${DB_RULES_REFRESH_MS}`,
  );

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on("ready", () => {
    console.log(`[discord-worker] connected as ${client.user?.tag ?? "unknown"}`);
  });

  client.on("messageCreate", async (message) => {
    if (!isAllowedMessage(message)) return;

    if (DEBUG_RAW_DISCORD_EVENT) {
      console.log(
        "[discord-worker] raw message",
        JSON.stringify(
          {
            id: message.id,
            guildId: message.guildId,
            channelId: message.channelId,
            content: shortLog(message.content ?? "", 800),
          },
          null,
          2,
        ),
      );
    }

    try {
      const payload = await buildNormalizedPayload(message);
      await postToIngestEndpoint(payload as Record<string, unknown>);
      console.log(
        `[discord-worker] delivered message=${message.id} signal=${payload.id}`,
      );
    } catch (error) {
      console.error(
        `[discord-worker] failed message=${message.id}`,
        error instanceof Error ? error.message : error,
      );
    }
  });

  client.on("error", (err) => {
    console.error("[discord-worker] client error", err);
  });

  await client.login(DISCORD_BOT_TOKEN);
}

main().catch((error) => {
  console.error("[discord-worker] fatal", error);
  process.exit(1);
});
