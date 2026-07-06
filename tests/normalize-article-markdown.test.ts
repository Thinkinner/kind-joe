import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArticleMarkdown } from "@/lib/content/normalize-article-markdown";

test("promotes title-case source-first section lines to markdown headings", () => {
  const input = [
    "# Lakers trade Ayton for Hardy",
    "",
    "Why It Matters",
    "",
    "The front office is rebuilding around Doncic.",
    "",
    "Opposing Context",
    "",
    "Some analysts question the fit.",
    "",
    "What Happens Next",
    "",
    "Training camp starts in October.",
  ].join("\n");

  const output = normalizeArticleMarkdown(input);

  assert.match(output, /### WHY IT MATTERS/);
  assert.match(output, /### OPPOSING CONTEXT/);
  assert.match(output, /### WHAT HAPPENS NEXT/);
  assert.doesNotMatch(output, /^Why It Matters$/m);
});

test("repairs orphan bold labels in fact box bullets", () => {
  const input = [
    "### FACT BOX",
    "",
    "Lakers Receive:** Jaden Hardy, 2031 second-round pick",
    "",
    "* **Wizards Receive:** Deandre Ayton",
  ].join("\n");

  const output = normalizeArticleMarkdown(input);

  assert.match(output, /\*\*Lakers Receive:\*\* Jaden Hardy/);
  assert.doesNotMatch(output, /^Lakers Receive:\*\*/m);
});
