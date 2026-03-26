import type { SignalDeepDiveArticle } from "@/lib/aggregator/signal-deep-dive-types";

function textNode(text: string) {
  return { type: "text" as const, text };
}

function paragraph(text: string) {
  return {
    type: "paragraph" as const,
    content: [textNode(text)],
  };
}

function heading(level: number, text: string) {
  return {
    type: "heading" as const,
    attrs: { level },
    content: [textNode(text)],
  };
}

const READER_NOTE =
  "This story draws on multiple public reports and official statements. Details may change as new information emerges.";

/** TipTap JSON doc for ArticleContent (no duplicate H1 — page template renders title). */
export function buildTiptapDocFromBrief(article: SignalDeepDiveArticle) {
  const blocks: unknown[] = [paragraph(article.dek)];

  for (const sec of article.sections) {
    blocks.push(heading(3, sec.heading));
    for (const para of sec.body
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      blocks.push(paragraph(para));
    }
  }

  blocks.push(paragraph(READER_NOTE));

  return { type: "doc" as const, content: blocks };
}

export function estimateReadingMinutesFromBrief(article: SignalDeepDiveArticle) {
  const text = [
    article.dek,
    ...article.sections.flatMap((s) => [s.heading, s.body]),
  ].join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(45, Math.ceil(words / 200)));
}
