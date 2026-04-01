import type { Source } from "@/lib/aggregator/types";
import {
  normalizeTextForUrlSearch,
  parseHttpStoryUrlCandidate,
} from "@/lib/signals/signal-source-url";
import { canonicalizeSignalUrl } from "@/lib/signals/signal-enrichment";

const HTTP_URL_RE = /https?:\/\/[^\s<>\[\]()'"]+/gi;

/** Explicit X/Twitter status permalinks (generic URL regex can miss these when wrapped or split). */
const TWITTER_STATUS_RE =
  /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^/\s<>"']+?\/status\/\d+/gi;

function stripTrailingPunctuation(s: string): string {
  return s.replace(/[)\].,;:!?]+$/g, "");
}

/** Hosts that mean “this story lives on X/Twitter” (including common Discord preview domains). */
function isXOrTwitterHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "x.com" ||
    h.endsWith(".x.com") ||
    h === "twitter.com" ||
    h.endsWith(".twitter.com") ||
    h === "t.co" ||
    h === "vxtwitter.com" ||
    h.endsWith(".vxtwitter.com") ||
    h === "fxtwitter.com" ||
    h.endsWith(".fxtwitter.com") ||
    h === "fixvx.com" ||
    h.endsWith(".fixvx.com")
  );
}

function isDiscordInfrastructureHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "discord.com" ||
    h.endsWith(".discord.com") ||
    h === "discordapp.com" ||
    h.endsWith(".discordapp.com") ||
    h.endsWith(".discordapp.net") ||
    h === "discord.gg" ||
    h.endsWith(".discord.gg")
  );
}

function tryParseHttpUrl(raw: string): string | null {
  const t = stripTrailingPunctuation(normalizeTextForUrlSearch(raw).trim());
  if (!t.startsWith("http")) return null;
  try {
    return new URL(t).href;
  } catch {
    return null;
  }
}

function hostnameOf(href: string): string | null {
  try {
    return new URL(href).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** TweetShift often sets `source_url` to image/video CDN; prefer status or article links from text when possible. */
function isLowQualityStorySourceUrl(href: string): boolean {
  try {
    const u = new URL(href);
    const h = u.hostname.toLowerCase();
    if (h === "pbs.twimg.com" || h === "video.twimg.com") return true;
    if (h.endsWith(".twimg.com")) return true;
    if (u.pathname.includes("/amplify_video/")) return true;
    return false;
  } catch {
    return false;
  }
}

function urlsFromText(text: string): string[] {
  const out: string[] = [];
  const matches = text.match(HTTP_URL_RE) ?? [];
  for (const m of matches) {
    const href = tryParseHttpUrl(m);
    if (href) out.push(href);
  }
  return out;
}

function twitterStatusUrlsFromText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(TWITTER_STATUS_RE)) {
    const href = tryParseHttpUrl(m[0]);
    if (href) out.push(href);
  }
  return out;
}

function collectUrlsFromNormalizedText(norm: string, push: (href: string | null) => void) {
  for (const u of urlsFromText(norm)) push(u);
  for (const u of twitterStatusUrlsFromText(norm)) push(u);
}

type DiscordEmbed = Record<string, unknown>;

function embedTextChunks(embed: DiscordEmbed): string[] {
  const chunks: string[] = [];
  if (typeof embed.url === "string") chunks.push(embed.url);
  if (typeof embed.description === "string") chunks.push(embed.description);
  if (typeof embed.title === "string") chunks.push(embed.title);

  const footer = embed.footer;
  if (footer && typeof footer === "object" && footer !== null) {
    const t = (footer as { text?: unknown }).text;
    if (typeof t === "string") chunks.push(t);
  }

  const author = embed.author;
  if (author && typeof author === "object" && author !== null) {
    const au = author as { url?: unknown; name?: unknown };
    if (typeof au.url === "string") chunks.push(au.url);
    if (typeof au.name === "string") chunks.push(au.name);
  }

  const fields = embed.fields;
  if (Array.isArray(fields)) {
    for (const f of fields) {
      if (!f || typeof f !== "object") continue;
      const fv = f as { name?: unknown; value?: unknown };
      if (typeof fv.name === "string") chunks.push(fv.name);
      if (typeof fv.value === "string") chunks.push(fv.value);
    }
  }

  return chunks;
}

function pickDiscordShape(obj: Record<string, unknown>): {
  content?: string;
  embeds?: unknown[];
} {
  return {
    content: typeof obj.content === "string" ? obj.content : undefined,
    embeds: Array.isArray(obj.embeds) ? obj.embeds : undefined,
  };
}

/** If `obj` is a wrapper, unwrap one level of `message` (discord.js / some bridges). */
function resolveDiscordContentEmbeds(obj: Record<string, unknown>): {
  content?: string;
  embeds?: unknown[];
} {
  const direct = pickDiscordShape(obj);
  if (direct.content !== undefined || direct.embeds !== undefined) {
    return direct;
  }
  const msg = obj.message;
  if (msg && typeof msg === "object") {
    return pickDiscordShape(msg as Record<string, unknown>);
  }
  return {};
}

/** `kindjoe-signal-worker` sends `embed_description` / `embed_title` instead of a Discord `embeds` array. */
function syntheticEmbedsFromFlatWorker(root: Record<string, unknown>): unknown[] {
  const desc =
    typeof root.embed_description === "string"
      ? root.embed_description
      : typeof root.embedDescription === "string"
        ? root.embedDescription
        : "";
  const title =
    typeof root.embed_title === "string"
      ? root.embed_title
      : typeof root.embedTitle === "string"
        ? root.embedTitle
        : "";
  if (!desc.trim() && !title.trim()) return [];
  const o: Record<string, unknown> = {};
  if (desc.trim()) o.description = desc;
  if (title.trim()) o.title = title;
  return [o];
}

function mergeWorkerFlatEmbeds(
  shape: { content?: string; embeds?: unknown[] },
  root: Record<string, unknown>,
): { content?: string; embeds?: unknown[] } {
  const extra = syntheticEmbedsFromFlatWorker(root);
  if (extra.length === 0) return shape;
  const base = Array.isArray(shape.embeds) ? [...shape.embeds] : [];
  return { ...shape, embeds: [...base, ...extra] };
}

/**
 * Workers often wrap the Discord-shaped body as `message`, gateway `d`, or `data`.
 * Produces `{ content, embeds }` for URL extraction and for the aggregated ingest text.
 * Flat `embed_*` fields from `kindjoe-signal-worker` are merged into `embeds` even when `content` exists.
 */
export function coerceDiscordIntelPayload(payload: unknown): {
  content?: string;
  embeds?: unknown[];
} {
  if (!payload || typeof payload !== "object") return {};
  const p = payload as Record<string, unknown>;

  let shape = resolveDiscordContentEmbeds(p);
  if (shape.content === undefined && shape.embeds === undefined) {
    for (const key of ["message", "d", "data", "payload", "body"] as const) {
      const inner = p[key];
      if (!inner || typeof inner !== "object") continue;
      shape = resolveDiscordContentEmbeds(inner as Record<string, unknown>);
      if (shape.content !== undefined || shape.embeds !== undefined) break;
    }
  }

  return mergeWorkerFlatEmbeds(shape, p);
}

const BRIDGE_SOURCE_KEYS = [
  "source_url",
  "sourceUrl",
  "story_url",
  "storyUrl",
] as const;

function pushBridgeSourceHintsFromObject(o: Record<string, unknown>, out: unknown[]) {
  for (const k of BRIDGE_SOURCE_KEYS) {
    const v = o[k];
    if (v != null) out.push(v);
  }
}

/** Walk common wrapper keys so `source_url` nested under `message` / `data` still resolves. */
export function collectBridgeSourceUrlCandidates(payload: unknown): unknown[] {
  const out: unknown[] = [];

  function walk(obj: unknown, depth: number) {
    if (depth > 8 || !obj || typeof obj !== "object") return;
    const o = obj as Record<string, unknown>;
    pushBridgeSourceHintsFromObject(o, out);
    for (const nest of [
      "message",
      "d",
      "data",
      "payload",
      "body",
      "intel",
    ] as const) {
      if (nest in o && o[nest] != null) walk(o[nest], depth + 1);
    }
  }

  walk(payload, 0);
  return out;
}

/**
 * Discord only delivers the payload; the **X post URL** is often in:
 * 1) `content`, then
 * 2) embed `url` / `description` / `title` / `footer.text` / `fields[]` / `author.url` / `author.name`.
 *
 * Zero-width characters are stripped before matching. Twitter/X `/status/id` links are matched
 * explicitly so TweetShift-style embeds still resolve when the generic URL slice fails.
 */
export function extractDiscordStoryUrl(payload: unknown): string | null {
  const shape = coerceDiscordIntelPayload(payload);

  const seen = new Set<string>();
  const ordered: string[] = [];

  const push = (href: string | null) => {
    if (!href || seen.has(href)) return;
    seen.add(href);
    ordered.push(href);
  };

  const content = typeof shape.content === "string" ? shape.content : "";
  collectUrlsFromNormalizedText(normalizeTextForUrlSearch(content), push);

  const embeds = Array.isArray(shape.embeds) ? shape.embeds : [];
  for (const raw of embeds) {
    if (!raw || typeof raw !== "object") continue;
    for (const chunk of embedTextChunks(raw as DiscordEmbed)) {
      collectUrlsFromNormalizedText(normalizeTextForUrlSearch(chunk), push);
    }
  }

  const good = (href: string) => !isLowQualityStorySourceUrl(href);

  for (const href of ordered) {
    if (!good(href)) continue;
    const h = hostnameOf(href);
    if (h && isXOrTwitterHost(h)) return href;
  }

  for (const href of ordered) {
    if (!good(href)) continue;
    const h = hostnameOf(href);
    if (h && !isDiscordInfrastructureHost(h)) return href;
  }

  for (const href of ordered) {
    const h = hostnameOf(href);
    if (h && isXOrTwitterHost(h)) return href;
  }

  for (const href of ordered) {
    const h = hostnameOf(href);
    if (h && !isDiscordInfrastructureHost(h)) return canonicalizeSignalUrl(href) ?? href;
  }

  const fallback = ordered[0] ?? null;
  return canonicalizeSignalUrl(fallback) ?? fallback;
}

/**
 * Full webhook resolution: any `source_url` / `story_url` (camel or snake) anywhere under common
 * wrappers, then parse coerced Discord `content` / `embeds`.
 */
export function resolveDiscordWebhookSourceUrl(payload: unknown): string | null {
  const extracted = canonicalizeSignalUrl(extractDiscordStoryUrl(payload));

  let bridgeFirst: string | null = null;
  for (const hint of collectBridgeSourceUrlCandidates(payload)) {
    const u = parseHttpStoryUrlCandidate(hint);
    if (u) {
      bridgeFirst = canonicalizeSignalUrl(u) ?? u;
      break;
    }
  }

  if (bridgeFirst && !isLowQualityStorySourceUrl(bridgeFirst)) return bridgeFirst;
  if (extracted) return extracted;
  return bridgeFirst;
}

/** Map story URL host → {@link Source} for DB + UI (`signals.source`). */
export function intelSourceFromStoryUrl(sourceUrl: string | null): Source {
  if (!sourceUrl) return "Discord";
  const h = hostnameOf(sourceUrl);
  if (h && isXOrTwitterHost(h)) return "X";
  return "Discord";
}
