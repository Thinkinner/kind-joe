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
    assert.deepEqual(
      inferCanonicalRegionTagSlugs({
        category: "Oxnard",
        tags: [],
      }),
      [],
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
        tags: ["breaking"],
      }),
      [],
    );
  });
});
