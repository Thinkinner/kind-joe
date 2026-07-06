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
  "WHY IT MATTERS",
  "WHAT HAPPENS NOW",
  "WHAT HAPPENS NEXT",
  "OPPOSING CONTEXT",
  "WHAT WE STILL DON'T KNOW",
  "SOURCE NOTE",
  "WHAT WE'RE TRACKING",
  "BACKGROUND AND CONTEXT",
  "WHAT TO WATCH",
  "EDITORIAL NOTE",
] as const;

/** Title-case variants AI often emits instead of all-caps section labels. */
const SECTION_TITLE_CASE: Record<string, (typeof SECTION_LABELS)[number]> = {
  Subhead: "SUBHEAD",
  Lede: "LEDE",
  "What Happened": "WHAT HAPPENED",
  "Fact Box": "FACT BOX",
  "By the Numbers": "BY THE NUMBERS",
  "Charges Filed": "CHARGES FILED",
  "Key Date": "KEY DATE",
  "The Bigger Question": "THE BIGGER QUESTION",
  "The Other Side": "THE OTHER SIDE",
  "Why It Matters": "WHY IT MATTERS",
  "What Happens Now": "WHAT HAPPENS NOW",
  "What Happens Next": "WHAT HAPPENS NEXT",
  "Opposing Context": "OPPOSING CONTEXT",
  "What We Still Don't Know": "WHAT WE STILL DON'T KNOW",
  "Source Note": "SOURCE NOTE",
  "What We're Tracking": "WHAT WE'RE TRACKING",
  "Background and Context": "BACKGROUND AND CONTEXT",
  "What to Watch": "WHAT TO WATCH",
  "Editorial Note": "EDITORIAL NOTE",
};

const SECTION_HEADING_PREFIX = "###";

function sectionLabelsPattern(): string {
  return SECTION_LABELS.map((label) => escapeForRegex(label)).join("|");
}

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

function toSectionHeading(label: string): string {
  return `${SECTION_HEADING_PREFIX} ${label.toUpperCase()}`;
}

/** Repair AI output like "Lakers Receive:** text" (missing opening **). */
function repairOrphanBoldLabels(input: string): string {
  return input
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const orphanBold = trimmed.match(
        /^(?:[-*+]\s*)?([A-Za-z][A-Za-z0-9\s&'/:,-]{1,48}):\*\*\s*(.+)$/,
      );
      if (orphanBold?.[1] && orphanBold[2]) {
        const prefix = line.match(/^\s*/)?.[0] ?? "";
        const bullet = trimmed.match(/^([-*+]\s*)/)?.[1] ?? "";
        return `${prefix}${bullet}**${orphanBold[1]}:** ${orphanBold[2]}`;
      }
      return line;
    })
    .join("\n");
}

function promoteTitleCaseSectionHeadings(input: string): string {
  let normalized = input;
  for (const [titleCase, upperLabel] of Object.entries(SECTION_TITLE_CASE)) {
    const safeTitle = escapeForRegex(titleCase);
    normalized = normalized.replace(
      new RegExp(`^\\s*\\*\\*\\s*(${safeTitle})\\s*\\*\\*\\s*$`, "gim"),
      () => toSectionHeading(upperLabel),
    );
    normalized = normalized.replace(
      new RegExp(`^\\s*(${safeTitle})\\s*$`, "gim"),
      () => toSectionHeading(upperLabel),
    );
  }
  return normalized;
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
    new RegExp(
      `^>\\s*\\*{0,2}\\s*(${sectionLabelsPattern()})\\s*\\*{0,2}\\s*(.*)$`,
      "gim",
    ),
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
      `(^|[\\s.])(?:(?<![\\#])##\\s+|\\*\\s+)(${safeLabel})\\*?`,
      "gi",
    );
    normalized = normalized.replace(
      headingOrAsteriskPattern,
      (_match, prefix: string, captured: string) =>
        `${prefix}\n\n${SECTION_HEADING_PREFIX} ${captured.toUpperCase()}\n\n`,
    );
  }

  // Convert standalone section labels (plain or bold) into real headings.
  for (const label of SECTION_LABELS) {
    const safeLabel = escapeForRegex(label);
    normalized = normalized.replace(
      new RegExp(`^\\s*\\*\\*\\s*(${safeLabel})\\s*\\*\\*\\s*$`, "gim"),
      (_match, captured: string) => toSectionHeading(captured),
    );
    normalized = normalized.replace(
      new RegExp(`^\\s*(${safeLabel})\\s*$`, "gim"),
      (_match, captured: string) => toSectionHeading(captured),
    );
  }

  normalized = promoteTitleCaseSectionHeadings(normalized);
  normalized = repairOrphanBoldLabels(normalized);

  // Keep handling generic uppercase "## LABEL" mistakes (not ### markdown headings).
  normalized = normalized.replace(
    /(?<!\#)##\s+([A-Z][A-Z0-9 &'/-]{2,}?)(?:\*)?(?=(?:\s{2,}|\s+[A-Z][a-z]|\n|$))/g,
    (_match, label: string) => `\n\n**${label.trim()}**\n\n`,
  );

  // Ensure bold labels are separated from immediately following sentence text.
  normalized = normalized.replace(
    /(\*\*[A-Z][A-Z0-9 &'/-]{2,}\*\*)([A-Z0-9])/g,
    "$1\n\n$2",
  );

  // Remove stray markdown quote markers that can appear before normalized labels.
  normalized = normalized.replace(
    new RegExp(`^>\\s*(\\*\\*(?:${sectionLabelsPattern()})\\*\\*)$`, "gim"),
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
