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
    const videoAt = markdown.indexOf("dWnKpsjNLdU");
    assert.ok(videoAt > markdown.indexOf("Two."));
    assert.ok(cardAt > videoAt);
    assert.ok(cardAt < markdown.indexOf("Three."));
    assert.equal(markdown.includes("banner.jpg"), false);
    assert.equal(appendBackTaxesCtaMarkdown(markdown), markdown);

    const html = appendBackTaxesCtaHtml(
      "<p>One.</p><p>Two.</p><p>Three.</p><p>Four.</p>",
    );
    const htmlCardAt = html.indexOf("Behind on back taxes");
    const htmlVideoAt = html.indexOf("dWnKpsjNLdU");
    assert.ok(htmlVideoAt > html.indexOf("Two."));
    assert.ok(htmlCardAt > htmlVideoAt);
    assert.ok(htmlCardAt < html.indexOf("Three."));
    assert.equal(appendBackTaxesCtaHtml(html), html);

    const custom = appendBackTaxesCtaMarkdown("One.\n\nTwo.\n\nThree.", {
      videoUrl: "https://res.cloudinary.com/demo/video/upload/promo.mp4",
      bannerImageUrl: "https://cdn.example/banner.jpg",
    });
    const customVideo = custom.indexOf("promo.mp4");
    const customBanner = custom.indexOf("banner.jpg");
    assert.ok(customVideo > custom.indexOf("One."));
    assert.ok(customBanner > customVideo);
    assert.ok(customBanner < custom.indexOf("Three."));
    assert.equal(custom.includes("Behind on back taxes"), false);
  });
});
