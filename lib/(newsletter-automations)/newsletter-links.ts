import type { NewsletterStory } from "@/lib/(newsletter-automations)/types";

const ABSOLUTE_URL_RE = /^https?:\/\//i;
const LOCAL_HOST_RE = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)(:\d+)?$/i;

function hostFromMaybeUrl(raw: string): string {
  const input = raw.trim();
  if (!input) return "";
  try {
    const asUrl = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    return new URL(asUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function normalizeSiteBase(raw?: string): string {
  const value = (raw || "").trim().replace(/\/+$/, "");
  if (value) {
    const host = hostFromMaybeUrl(value);
    if (LOCAL_HOST_RE.test(host)) {
      return "https://www.kindjoe.com";
    }
    return value;
  }
  return "https://www.kindjoe.com";
}

export function normalizeStorySlug(rawSlug?: string): string {
  const slug = (rawSlug || "").trim();
  if (!slug) return "";
  if (ABSOLUTE_URL_RE.test(slug)) return "";
  return slug.replace(/^\/+/, "");
}

export function buildNewsletterStoryHref(
  story: Pick<NewsletterStory, "slug" | "sourceUrl">,
  siteBase: string,
  options?: { fallbackToHome?: boolean },
): string {
  const slug = normalizeStorySlug(story.slug);
  if (slug) return `${siteBase}/${slug}`;

  const sourceUrl = (story.sourceUrl || "").trim();
  if (ABSOLUTE_URL_RE.test(sourceUrl)) return sourceUrl;

  return options?.fallbackToHome ? `${siteBase}/` : "";
}
