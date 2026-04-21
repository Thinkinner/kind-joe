import test from "node:test";
import assert from "node:assert/strict";
import {
  blendRelatedScore,
  cosineSimilarity,
  jaccardSimilarity,
  recencyScore,
} from "@/lib/recommendations/scoring";

test("cosineSimilarity returns 1 for identical vectors", () => {
  const score = cosineSimilarity([0.1, 0.2, 0.3], [0.1, 0.2, 0.3]);
  assert.equal(score, 1);
});

test("cosineSimilarity handles orthogonal vectors", () => {
  const score = cosineSimilarity([1, 0], [0, 1]);
  assert.ok(score >= 0.49 && score <= 0.51);
});

test("jaccardSimilarity computes overlap ratio", () => {
  const score = jaccardSimilarity(["ai", "politics", "california"], ["ai", "finance"]);
  assert.equal(score, 0.25);
});

test("recencyScore decays over time", () => {
  const now = new Date("2026-04-21T12:00:00.000Z");
  const fresh = recencyScore(new Date("2026-04-21T11:00:00.000Z"), now);
  const stale = recencyScore(new Date("2026-03-10T12:00:00.000Z"), now);
  assert.ok(fresh > stale);
});

test("blendRelatedScore prioritizes semantic strength", () => {
  const strongSemantic = blendRelatedScore({
    semanticSimilarity: 0.95,
    tagOverlap: 0.1,
    categoryOverlap: 0,
    recency: 0.4,
  });
  const weakSemantic = blendRelatedScore({
    semanticSimilarity: 0.4,
    tagOverlap: 0.8,
    categoryOverlap: 1,
    recency: 0.9,
  });
  assert.ok(strongSemantic > weakSemantic);
});

