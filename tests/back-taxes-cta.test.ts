import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendBackTaxesCtaHtml,
  appendBackTaxesCtaMarkdown,
} from "../lib/content/back-taxes-cta";

describe("back taxes sponsor card", () => {
  it("places the card in the middle of the article, once", () => {
    const markdown = appendBackTaxesCtaMarkdown("One.\n\nTwo.\n\nThree.\n\nFour.");
    const cardAt = markdown.indexOf("Behind on back taxes");
    assert.ok(cardAt > markdown.indexOf("Two."));
    assert.ok(cardAt < markdown.indexOf("Three."));
    assert.equal(appendBackTaxesCtaMarkdown(markdown), markdown);

    const html = appendBackTaxesCtaHtml(
      "<p>One.</p><p>Two.</p><p>Three.</p><p>Four.</p>",
    );
    const htmlCardAt = html.indexOf("Behind on back taxes");
    assert.ok(htmlCardAt > html.indexOf("Two."));
    assert.ok(htmlCardAt < html.indexOf("Three."));
    assert.equal(appendBackTaxesCtaHtml(html), html);
  });
});
