import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import { universalParser } from "@/lib/content/parser";

const KEY_EDITORIAL_SECTIONS = [
  "THE OTHER SIDE",
  "WHAT HAPPENED",
  "THE BIGGER QUESTION",
] as const;

export type ArticleContentSources = {
  contentMarkdown?: string | null;
  content?: unknown;
  contentHtml?: string | null;
};

function toNormalizedMarkdown(value: unknown): string {
  if (value == null) return "";
  const raw =
    typeof value === "string" ? value : universalParser(value);
  return normalizeArticleMarkdown(raw).trim();
}

function hasEditorialSection(markdown: string, label: string): boolean {
  return markdown.toUpperCase().includes(label.toUpperCase());
}

function missingKeyEditorialSections(markdown: string): string[] {
  return KEY_EDITORIAL_SECTIONS.filter(
    (label) => !hasEditorialSection(markdown, label),
  );
}

/**
 * Prefer stored markdown; fall back to legacy jsonb/html when markdown is empty.
 * If stored markdown is present but missing key editorial sections that exist
 * in the legacy payload, use the richer legacy conversion instead.
 */
export function resolveArticleContentMarkdown(
  sources: ArticleContentSources,
): string | null {
  const stored = toNormalizedMarkdown(sources.contentMarkdown ?? "");
  const fromJsonb = toNormalizedMarkdown(sources.content ?? "");
  const fromHtml = toNormalizedMarkdown(sources.contentHtml ?? "");
  const legacy = fromJsonb || fromHtml;

  if (!stored) return legacy || null;
  if (!legacy) return stored || null;

  const storedMissing = missingKeyEditorialSections(stored);
  const legacyRecoversSection = storedMissing.some((label) =>
    hasEditorialSection(legacy, label),
  );
  if (legacyRecoversSection) return legacy;

  // Prefer the longer body when legacy clearly has more editorial material.
  if (legacy.length > stored.length * 1.15) return legacy;

  return stored;
}
