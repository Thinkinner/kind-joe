import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";
import { asArticleJsonDoc, type JSONDoc, universalParser } from "@/lib/content/parser";

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

function legacyBodyFromSources(sources: ArticleContentSources): string {
  const fromJsonb = toNormalizedMarkdown(sources.content ?? "");
  const fromHtml = toNormalizedMarkdown(sources.contentHtml ?? "");
  return fromJsonb || fromHtml;
}

/**
 * Markdown-first: use stored `content_markdown`, then fall back to legacy jsonb/html.
 */
export function resolveArticleContentMarkdown(
  sources: ArticleContentSources,
): string | null {
  const stored = toNormalizedMarkdown(sources.contentMarkdown ?? "");
  if (stored) return stored;

  const legacy = legacyBodyFromSources(sources);
  return legacy || null;
}

/**
 * Render TipTap jsonb directly only when markdown resolution produced nothing
 * but a legacy doc payload still exists.
 */
export function shouldRenderLegacyJsonbDoc(
  sources: ArticleContentSources,
  doc?: JSONDoc | null,
): boolean {
  if (resolveArticleContentMarkdown(sources)) return false;
  return Boolean(doc?.content?.length);
}

export type ResolvedArticleDisplayContent = {
  contentMarkdown: string | null;
  contentDoc: JSONDoc | null;
  preferLegacyDoc: boolean;
};

/** Shared read-path for article pages and infinite related-chain stories. */
export function resolveArticleDisplayContent(
  sources: ArticleContentSources,
): ResolvedArticleDisplayContent {
  const contentDoc = asArticleJsonDoc(sources.content);
  const contentMarkdown = resolveArticleContentMarkdown(sources);
  return {
    contentMarkdown,
    contentDoc,
    preferLegacyDoc: shouldRenderLegacyJsonbDoc(sources, contentDoc),
  };
}
