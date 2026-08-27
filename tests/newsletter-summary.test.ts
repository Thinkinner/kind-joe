import test from "node:test";
import assert from "node:assert/strict";
import {
  formatNewsletterInlineHtml,
  splitNewsletterStorySummary,
} from "@/lib/(newsletter-automations)/newsletter-summary";

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

test("does not split italic titles into extra bullets", () => {
  const summary = [
    "Sony's Tom Holland-led blockbuster has officially become the second-highest-grossing film in U.S. domestic history.",
    "• The film surpassed *Avengers: Endgame*, leaving only *The Force Awakens* ahead on the all-time chart.",
    "• The massive success has revitalized the theatrical market following a series of summer slumps.",
    "• Industry analysts expect the \"Brand New Day\" arc to dominate the franchise's future release schedule.",
  ].join(" ");

  const { intro, bullets } = splitNewsletterStorySummary(summary);

  assert.match(intro, /second-highest-grossing/);
  assert.equal(bullets.length, 3);
  assert.equal(
    bullets[0],
    "The film surpassed *Avengers: Endgame*, leaving only *The Force Awakens* ahead on the all-time chart.",
  );
});

test("renders italic markdown after HTML escape", () => {
  const html = formatNewsletterInlineHtml(
    "The film surpassed *Avengers: Endgame*, leaving only *The Force Awakens* ahead.",
    escapeHtml,
  );

  assert.equal(
    html,
    "The film surpassed <em>Avengers: Endgame</em>, leaving only <em>The Force Awakens</em> ahead.",
  );
});

test("treats markdown list items as bullets without breaking italics", () => {
  const summary = [
    "Sony's blockbuster is now second all-time.",
    "* The film surpassed *Avengers: Endgame*.",
    "* Analysts expect more sequels.",
  ].join("\n");

  const { intro, bullets } = splitNewsletterStorySummary(summary);

  assert.equal(intro, "Sony's blockbuster is now second all-time.");
  assert.equal(bullets.length, 2);
  assert.equal(bullets[0], "The film surpassed *Avengers: Endgame*.");
});
