import type { NewsletterStory } from "@/lib/(newsletter-automations)/types";
import { splitNewsletterStorySummary } from "@/lib/(newsletter-automations)/newsletter-summary";

/**
 * Prose before the first bullet (same split as story preview / email body).
 */
function summaryProseBeforeBullets(summary: string): string {
  return splitNewsletterStorySummary(summary).intro;
}

function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const m = t.match(/^([\s\S]+?[.!?])(?=\s|$)/);
  if (m) return m[1].trim();
  return t.split(/\n/)[0]?.trim() || "";
}

/**
 * Daily Brief blue-box teaser: one short hook per top story, combined into one line.
 * Stays in sync when story summaries change in the editor.
 */
export function deriveNewsletterLeadFromStories(
  stories: NewsletterStory[],
): string {
  const segments = stories
    .slice(0, 4)
    .map((s) => {
      const prose = summaryProseBeforeBullets(s.summary || "");
      const sentence = firstSentence(prose);
      return sentence.replace(/\s+$/, "").replace(/[.!?]+$/, "");
    })
    .filter((s) => s.length > 0);

  if (segments.length === 0) return "";

  if (segments.length === 1) {
    const one = segments[0];
    return /[.!?]$/.test(one) ? one : `${one}.`;
  }

  const body = segments.join(", ");
  return body.endsWith(".") ? body : `${body}.`;
}
