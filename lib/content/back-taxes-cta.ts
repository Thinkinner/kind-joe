const MARKER = 'data-kindjoe-cta="back-taxes"';

/** Styled so it survives Joe Knows Ventura's article HTML, not only Tailwind. */
export const BACK_TAXES_CTA_HTML = `<div ${MARKER} style="margin:1.75rem 0;border-radius:12px;background:#0f172a;padding:1.5rem;color:#fff;font-family:inherit;"><div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#fdba74;">Sponsored</div><div style="margin-top:0.5rem;font-size:1.5rem;line-height:1.2;font-weight:700;color:#fff;">Behind on back taxes?</div><p style="margin:0.5rem 0 0;line-height:1.6;color:#e2e8f0;">Get help from someone local. Text <strong style="color:#fff;">HELP</strong> to <strong style="color:#fff;">(805) 719-7630</strong> and we'll set up a time to talk that works for you.</p></div>`;

export function hasBackTaxesCta(value: string | null | undefined): boolean {
  return (value ?? "").includes(MARKER) || (value ?? "").includes("(805) 719-7630");
}

function middleSplitIndex(count: number): number {
  if (count <= 1) return count;
  return Math.ceil(count / 2);
}

function insertAtMiddle(parts: string[], card: string, joiner: string): string {
  const blocks = parts.map((part) => part.trim()).filter(Boolean);
  if (blocks.length === 0) return card;
  const at = middleSplitIndex(blocks.length);
  return [...blocks.slice(0, at), card, ...blocks.slice(at)].join(joiner);
}

/** Place the sponsor card halfway through the article HTML. */
export function appendBackTaxesCtaHtml(html: string | null | undefined): string {
  const body = html?.trim() ?? "";
  if (!body) return BACK_TAXES_CTA_HTML;
  if (hasBackTaxesCta(body)) return body;

  const pieces = body.split(/(<\/p>)/i);
  const paragraphCount = pieces.filter((piece) => /^<\/p>$/i.test(piece)).length;
  if (paragraphCount >= 2) {
    const at = middleSplitIndex(paragraphCount);
    let seen = 0;
    const out: string[] = [];
    for (const piece of pieces) {
      out.push(piece);
      if (/^<\/p>$/i.test(piece)) {
        seen += 1;
        if (seen === at) out.push(`\n${BACK_TAXES_CTA_HTML}\n`);
      }
    }
    return out.join("");
  }

  return insertAtMiddle(body.split(/\n{2,}/), BACK_TAXES_CTA_HTML, "\n\n");
}

/** Place the sponsor card halfway through the article markdown. */
export function appendBackTaxesCtaMarkdown(
  markdown: string | null | undefined,
): string {
  const body = markdown?.trim() ?? "";
  if (!body) return BACK_TAXES_CTA_HTML;
  if (hasBackTaxesCta(body)) return body;
  return insertAtMiddle(body.split(/\n{2,}/), BACK_TAXES_CTA_HTML, "\n\n");
}
