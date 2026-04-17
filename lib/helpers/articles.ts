/** URL-safe slug for articles and category/tag slugs. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const ARTICLE_MIN_WORDS_FOR_PUBLISH = 600;

function countWords(text: string): number {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return 0;
  return normalized.split(" ").length;
}

function collectTextFromRichContent(value: unknown, bucket: string[]) {
  if (!value) return;
  if (typeof value === "string") {
    bucket.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextFromRichContent(item, bucket);
    }
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") {
      bucket.push(record.text);
    }
    for (const nested of Object.values(record)) {
      collectTextFromRichContent(nested, bucket);
    }
  }
}

export function countWordsFromHtml(html?: string | null): number {
  if (!html) return 0;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return countWords(text);
}

export function countWordsFromRichContent(content: unknown): number {
  const textParts: string[] = [];
  collectTextFromRichContent(content, textParts);
  return countWords(textParts.join(" "));
}

export function computeArticleWordCount(input: {
  contentHtml?: string | null;
  content?: unknown;
}): number {
  const htmlWords = countWordsFromHtml(input.contentHtml);
  const richWords = countWordsFromRichContent(input.content);
  return Math.max(htmlWords, richWords);
}

export function calcReadingMinutesFromHtml(html?: string | null): number {
  if (!html) return 1;
  const words = countWordsFromHtml(html);
  return Math.max(1, Math.round(words / 200));
}
