export type NewsletterSummaryParts = {
  intro: string;
  bullets: string[];
};

export type NewsletterInlineMark = {
  type: "text" | "em" | "strong";
  value: string;
};

const UNICODE_BULLETS = /[\u2022\u2023\u25E6\u2043\u2219]/g;
const INLINE_MARKDOWN = /(\*\*[^*]+?\*\*|\*[^*]+?\*)/g;

/**
 * Split a story summary into intro prose + bullets.
 * Only real bullets (and markdown list items at the start of a line) count.
 * Mid-sentence italics like *Avengers: Endgame* must stay in the same sentence.
 */
export function splitNewsletterStorySummary(
  summary: string,
): NewsletterSummaryParts {
  const clean = (summary || "")
    .replace(UNICODE_BULLETS, "•")
    .replace(/(^|\n)\s*[-*]\s+/g, "$1• ");

  const parts = clean
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    intro: parts[0] || "",
    bullets: parts.slice(1),
  };
}

export function tokenizeNewsletterInlineMarkdown(
  text: string,
): NewsletterInlineMark[] {
  if (!text) return [];

  const tokens: NewsletterInlineMark[] = [];
  const chunks = text.split(INLINE_MARKDOWN);

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (chunk.startsWith("**") && chunk.endsWith("**") && chunk.length >= 4) {
      tokens.push({ type: "strong", value: chunk.slice(2, -2) });
      continue;
    }
    if (chunk.startsWith("*") && chunk.endsWith("*") && chunk.length >= 2) {
      tokens.push({ type: "em", value: chunk.slice(1, -1) });
      continue;
    }
    tokens.push({ type: "text", value: chunk });
  }

  return tokens;
}

export function formatNewsletterInlineHtml(
  plain: string,
  escapeHtml: (value: string) => string,
): string {
  return tokenizeNewsletterInlineMarkdown(plain)
    .map((token) => {
      const value = escapeHtml(token.value);
      if (token.type === "strong") return `<strong>${value}</strong>`;
      if (token.type === "em") return `<em>${value}</em>`;
      return value;
    })
    .join("");
}
