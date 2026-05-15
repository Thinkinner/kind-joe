const SECTION_LABELS = [
  "SUBHEAD",
  "LEDE",
  "WHAT HAPPENED",
  "FACT BOX",
  "BY THE NUMBERS",
  "CHARGES FILED",
  "KEY DATE",
  "THE BIGGER QUESTION",
  "THE OTHER SIDE",
  "WHAT HAPPENS NOW",
  "WHAT WE STILL DON'T KNOW",
  "SOURCE NOTE",
] as const;
const SECTION_HEADING_PREFIX = "###";

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isStructuralLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return (
    /^#{1,6}\s/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^[-*+]\s/.test(trimmed) ||
    /^\d+\.\s/.test(trimmed) ||
    /^```/.test(trimmed) ||
    /^\|/.test(trimmed) ||
    /^---+$/.test(trimmed)
  );
}

function maybeInsertParagraphBreaks(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i] ?? "";
    const next = lines[i + 1] ?? "";
    out.push(current);

    const currentTrimmed = current.trim();
    const nextTrimmed = next.trim();
    if (!currentTrimmed || !nextTrimmed) continue;
    if (isStructuralLine(currentTrimmed) || isStructuralLine(nextTrimmed)) continue;

    // Promote likely paragraph boundaries where generators used a single newline.
    const boundaryByPunctuation = /[.!?]"?$/.test(currentTrimmed);
    const nextLooksLikeParagraphStart = /^[A-Z"“]/.test(nextTrimmed);
    if (boundaryByPunctuation && nextLooksLikeParagraphStart) {
      out.push("");
    }
  }

  return out.join("\n");
}

function normalizeHeadingText(value: string): string {
  return value
    .replace(/[*_`]/g, "")
    .replace(/[:\-–—]+$/g, "")
    .trim()
    .toUpperCase();
}

function unwrapAccidentalSectionBlockquotes(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  const sectionSet = new Set(SECTION_LABELS.map((label) => label.toUpperCase()));
  let insideKnownSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch?.[1]) {
      const headingText = normalizeHeadingText(headingMatch[1]);
      insideKnownSection = sectionSet.has(headingText);
      out.push(line);
      continue;
    }

    // Also treat plain/bold section labels as section boundaries.
    const plainSectionCandidate = normalizeHeadingText(
      trimmed.replace(/^\*\*(.+)\*\*$/u, "$1"),
    );
    if (sectionSet.has(plainSectionCandidate)) {
      insideKnownSection = true;
      out.push(line);
      continue;
    }

    if (insideKnownSection && /^>\s?/.test(trimmed)) {
      const unquoted = line.replace(/^\s*>\s?/, "");
      const normalizedBullet = unquoted.replace(/^\s*•\s+/, "* ");
      out.push(normalizedBullet);
      continue;
    }

    // Stop section-unquote mode when a new regular paragraph starts.
    if (insideKnownSection && trimmed && !/^>\s?/.test(trimmed)) {
      const startsNewStructuralBlock =
        /^#{1,6}\s+/.test(trimmed) ||
        /^[A-Z][A-Z0-9\s&'/:,-]{3,}:?$/.test(trimmed) ||
        /^\*\*[A-Z][A-Z0-9\s&'/:,-]{3,}\*\*:?$/.test(trimmed);
      if (startsNewStructuralBlock) {
        insideKnownSection = false;
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

export function normalizeArticleMarkdown(input: string): string {
  let normalized = String(input ?? "").replace(/\r\n/g, "\n");

  // First pass: normalize line-level markdown symbols from AI output.
  normalized = normalized
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Convert bullet dot character to markdown bullet.
      if (trimmed.startsWith("•")) {
        return `* ${trimmed.slice(1).trim()}`;
      }

      // Convert all-caps starred lines like "*BY THE NUMBERS*" into headings.
      const starredHeading = trimmed.match(/^[*]{1,2}\s*([A-Z0-9\s&'/:,-]{3,})\s*[*]{1,2}$/);
      if (starredHeading?.[1]) {
        return `${SECTION_HEADING_PREFIX} ${starredHeading[1].trim()}`;
      }

      // Remove accidental trailing star from markdown headings.
      if (/^#{1,6}\s+/.test(trimmed) && trimmed.endsWith("*")) {
        return trimmed.slice(0, -1).trimEnd();
      }

      return line;
    })
    .join("\n");

  // If known section labels were accidentally emitted as blockquotes,
  // convert them back to regular section text.
  normalized = normalized.replace(
    /^>\s*\*{0,2}\s*(SUBHEAD|LEDE|WHAT HAPPENED|FACT BOX|BY THE NUMBERS|CHARGES FILED|KEY DATE|THE BIGGER QUESTION|THE OTHER SIDE|WHAT HAPPENS NOW|WHAT WE STILL DON'T KNOW|SOURCE NOTE)\s*\*{0,2}\s*(.*)$/gim,
    (_match, label: string, trailing: string) => {
      const cleanLabel = label.toUpperCase().trim();
      const cleanTrailing = String(trailing ?? "").trim();
      return cleanTrailing
        ? `\n\n${SECTION_HEADING_PREFIX} ${cleanLabel}\n\n${cleanTrailing}`
        : `\n\n${SECTION_HEADING_PREFIX} ${cleanLabel}`;
    },
  );

  // Remove malformed heading prefixes and trailing markers around known labels.
  for (const label of SECTION_LABELS) {
    const safeLabel = escapeForRegex(label);
    const headingOrAsteriskPattern = new RegExp(
      `(^|[\\s.])(?:##\\s*|\\*\\s*)(${safeLabel})\\*?`,
      "gi",
    );
    normalized = normalized.replace(
      headingOrAsteriskPattern,
      (_match, prefix: string, captured: string) =>
        `${prefix}\n\n${SECTION_HEADING_PREFIX} ${captured.toUpperCase()}\n\n`,
    );
  }

  // Convert standalone section labels (plain or bold) into real H2 headings.
  for (const label of SECTION_LABELS) {
    const safeLabel = escapeForRegex(label);
    normalized = normalized.replace(
      new RegExp(`^\\s*\\*\\*\\s*(${safeLabel})\\s*\\*\\*\\s*$`, "gim"),
      (_match, captured: string) => `${SECTION_HEADING_PREFIX} ${captured.toUpperCase()}`,
    );
    normalized = normalized.replace(
      new RegExp(`^\\s*(${safeLabel})\\s*$`, "gim"),
      (_match, captured: string) => `${SECTION_HEADING_PREFIX} ${captured.toUpperCase()}`,
    );
  }

  // Keep handling generic uppercase "## LABEL" mistakes.
  normalized = normalized.replace(
    /##\s*([A-Z][A-Z0-9 &'/-]{2,}?)(?:\*)?(?=(?:\s{2,}|\s+[A-Z][a-z]|\n|$))/g,
    (_match, label: string) => `\n\n**${label.trim()}**\n\n`,
  );

  // Ensure labels/headings are separated from immediately following sentence text.
  normalized = normalized.replace(
    /(#{2,3}\s*[A-Z][A-Z0-9 &'/-]{2,})([A-Z0-9])/g,
    "$1\n\n$2",
  );
  normalized = normalized.replace(
    /(\*\*[A-Z][A-Z0-9 &'/-]{2,}\*\*)([A-Z0-9])/g,
    "$1\n\n$2",
  );

  // Remove stray markdown quote markers that can appear before normalized labels.
  normalized = normalized.replace(
    /^>\s*(\*\*(?:SUBHEAD|LEDE|WHAT HAPPENED|FACT BOX|BY THE NUMBERS|CHARGES FILED|KEY DATE|THE BIGGER QUESTION|THE OTHER SIDE|WHAT HAPPENS NOW|WHAT WE STILL DON'T KNOW|SOURCE NOTE)\*\*)$/gim,
    "$1",
  );

  // Remove orphan quote-marker-only lines that create empty quote blocks.
  normalized = normalized.replace(/^\s*>\s*$/gm, "");

  // Some AI outputs accidentally prefix section bodies with ">" markers.
  // Unwrap those only for our known newsroom section headings.
  normalized = unwrapAccidentalSectionBlockquotes(normalized);

  // If a quoted line is actually a list item, unquote it globally.
  normalized = normalized.replace(
    /^>\s*((?:[-*+]\s+|\d+\.\s+).*)$/gm,
    "$1",
  );

  // Convert obvious inline "## XYZ" leftovers into paragraph breaks.
  normalized = normalized.replace(/\s+##\s+/g, "\n\n");

  // Ensure single-line paragraph breaks are promoted to real markdown paragraphs.
  normalized = maybeInsertParagraphBreaks(normalized);

  // Remove accidental orphan marker asterisks and tighten whitespace.
  normalized = normalized.replace(/\*\*\s*\n\n\*/g, "**\n\n");
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  return normalized.trim();
}
