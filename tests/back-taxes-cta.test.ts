import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendBackTaxesCtaHtml,
  appendBackTaxesCtaMarkdown,
} from "../lib/content/back-taxes-cta";

describe("back taxes sponsor card", () => {
  it("appends the card to article html and markdown once", () => {
    const html = appendBackTaxesCtaHtml("<p>Oxnard police arrested a man.</p>");
    assert.match(html, /Oxnard police/);
    assert.match(html, /719-7630/);
    assert.equal(appendBackTaxesCtaHtml(html), html);

    const markdown = appendBackTaxesCtaMarkdown("Oxnard police arrested a man.");
    assert.match(markdown, /^Oxnard police/);
    assert.match(markdown, /Behind on back taxes/);
    assert.equal(appendBackTaxesCtaMarkdown(markdown), markdown);
  });
});
