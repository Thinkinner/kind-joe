import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferCanonicalRegionTagSlugs,
  textMatchesLocalNewsRegion,
  getLocalNewsRegionBySlug,
} from "../lib/local-news/regions";

describe("local news region matching", () => {
  it("matches Ventura via category text", () => {
    const ventura = getLocalNewsRegionBySlug("ventura-county")!;
    assert.equal(textMatchesLocalNewsRegion("Ventura County", ventura), true);
    assert.equal(textMatchesLocalNewsRegion("Crime", ventura), false);
  });

  it("infers canonical region tags from category", () => {
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({ category: "Ventura County", tags: [] }),
      ["ventura-county"],
    );
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "News",
        tags: ["Los Angeles crime"],
      }),
      ["la-news"],
    );
    // Category text "Oxnard" maps via the `oxnard` desk alias slug.
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "Oxnard",
        tags: [],
      }),
      ["oxnard-news"],
    );
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "General",
        tags: ["oxnard-news"],
      }),
      ["oxnard-news"],
    );
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "General",
        tags: ["oxnard"],
      }),
      ["oxnard-news"],
    );
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "General",
        tags: ["slo"],
      }),
      ["san-luis-obispo"],
    );
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "General",
        tags: ["san-luis-obispo-county"],
      }),
      ["san-luis-obispo"],
    );
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "General",
        tags: ["breaking"],
      }),
      [],
    );
  });

  it("resolves desk alias slugs to the canonical region", () => {
    assert.equal(getLocalNewsRegionBySlug("oxnard")?.slug, "oxnard-news");
    assert.equal(getLocalNewsRegionBySlug("cityofox")?.slug, "oxnard-news");
    assert.equal(getLocalNewsRegionBySlug("slo")?.slug, "san-luis-obispo");
    assert.equal(
      getLocalNewsRegionBySlug("joefromslo")?.slug,
      "san-luis-obispo",
    );
    assert.equal(
      getLocalNewsRegionBySlug("san-luis-obispo-county")?.slug,
      "san-luis-obispo",
    );
  });
});
