import test from "node:test";
import assert from "node:assert/strict";
import {
  isAdsenseEligibleInventory,
  isAdsenseRestrictedStory,
  pickAdsenseSafeArticles,
} from "@/lib/ads/adsense-inventory-policy";

test("flags child sexual abuse headlines as AdSense-restricted", () => {
  assert.equal(
    isAdsenseRestrictedStory(
      "Ojai Pastor and Massage Therapist Charged with Child Molestation Involving Multiple Young Victims",
    ),
    true,
  );
});

test("does not flag ordinary local news", () => {
  assert.equal(
    isAdsenseRestrictedStory(
      "The 5 Best Spots for Y2K & Streetwear Fits in SLO",
      "Vintage shops our editors actually use.",
    ),
    false,
  );
  assert.equal(
    isAdsenseRestrictedStory("Overturned Big Rig Downs Power Lines in Los Angeles"),
    false,
  );
});

test("hides ads on restricted or too-thin pages", () => {
  assert.equal(
    isAdsenseEligibleInventory({
      title: "Child molestation charges filed in Ojai",
      bodyMarkdown: "A ".repeat(800),
    }),
    false,
  );
  assert.equal(
    isAdsenseEligibleInventory({
      title: "Best cafes in LA",
      bodyMarkdown: "Short.",
    }),
    false,
  );
  assert.equal(
    isAdsenseEligibleInventory({
      title: "Best cafes in LA",
      bodyMarkdown: "Coffee ".repeat(450),
    }),
    true,
  );
});

test("picks safe homepage stories first", () => {
  const picked = pickAdsenseSafeArticles(
    [
      { title: "Pastor charged with child molestation", excerpt: "" },
      { title: "Need a WFH Escape Hatch in LA", excerpt: "Cafes" },
      { title: "Big rig crash in Sun Valley", excerpt: "" },
    ],
    2,
  );
  assert.deepEqual(
    picked.map((row) => row.title),
    ["Need a WFH Escape Hatch in LA", "Big rig crash in Sun Valley"],
  );
});
