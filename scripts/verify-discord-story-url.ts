/**
 * Quick sanity check: markdown Twitter link in Discord `content` → story URL + source.
 * Run: npx tsx scripts/verify-discord-story-url.ts
 */
import {
  intelSourceFromStoryUrl,
  resolveDiscordWebhookSourceUrl,
} from "../lib/webhooks/discord-intel-source";

const expected =
  "https://twitter.com/MarioNawfal/status/2037669746469138607";

const tribExpected = "https://trib.al/PRxCM6m";

const cases: {
  name: string;
  payload: unknown;
  expectUrl?: string;
  expectSource?: "X" | "Discord";
}[] = [
  {
    name: "markdown link in content",
    payload: {
      content: `[Quoted](${expected})`,
    },
  },
  {
    name: "bare URL in content",
    payload: { content: expected },
  },
  {
    name: "embed description only",
    payload: { content: "", embeds: [{ description: `See ${expected}` }] },
  },
  {
    name: "embed field value (TweetShift-style)",
    payload: {
      content: "",
      embeds: [
        {
          title: "New tweet",
          fields: [{ name: "Link", value: expected }],
        },
      ],
    },
  },
  {
    name: "embed footer.text",
    payload: {
      content: "",
      embeds: [{ footer: { text: `Source · ${expected}` } }],
    },
  },
  {
    name: "author.name contains URL text",
    payload: {
      content: "",
      embeds: [{ author: { name: `@user — ${expected}` } }],
    },
  },
  {
    name: "zero-width chars around URL in content",
    payload: {
      content: `@everyone \u200B${expected}\uFEFF`,
    },
  },
  {
    name: "nested message.content (worker wrapper)",
    payload: { message: { content: expected } },
  },
  {
    name: "gateway-style d.embeds only",
    payload: { d: { embeds: [{ description: `Tweet ${expected}` }] } },
  },
  {
    name: "source_url nested under data",
    payload: {
      data: { source_url: expected },
      message: { content: "ping" },
    },
  },
  {
    name: "worker flat embed_description (no embeds array)",
    payload: {
      content: "@everyone ping",
      embed_description: `Headline\n\n${expected}`,
      embed_title: null,
      source_url: expected,
    },
  },
  {
    name: "worker: reject pbs.twimg source_url when content has trib.al",
    payload: {
      source_url: "https://pbs.twimg.com/media/HEq1aMEW0AAold7.jpg",
      embed_title: null,
      embed_description: null,
      content:
        "[📷](https://pbs.twimg.com/media/HEq1aMEW0AAold7.jpg) [↧](https://trib.al/PRxCM6m) \n\n CONTENT: ",
    },
    expectUrl: tribExpected,
    expectSource: "Discord",
  },
];

let failed = false;
for (const { name, payload, expectUrl, expectSource } of cases) {
  const url = resolveDiscordWebhookSourceUrl(payload);
  const source = intelSourceFromStoryUrl(url);
  const wantUrl = expectUrl ?? expected;
  const wantSource = expectSource ?? "X";
  const ok = url === wantUrl && source === wantSource;
  if (!ok) failed = true;
  console.log(
    ok ? "✓" : "✗",
    name,
    JSON.stringify({ url, source }),
  );
}

if (failed) process.exit(1);
console.log("all cases ok");
