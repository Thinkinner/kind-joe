import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickWeightedAssignee } from "../lib/admin/kindjoe-assign-schedule";

describe("pickWeightedAssignee", () => {
  it("returns null for empty or zero-weight pools", () => {
    assert.equal(pickWeightedAssignee([]), null);
    assert.equal(
      pickWeightedAssignee([{ userId: "a", weight: 0, openCount: 0 }]),
      null,
    );
  });

  it("prefers higher weights over many draws", () => {
    const counts = { full: 0, poster: 0 };
    for (let i = 0; i < 1000; i++) {
      const pick = pickWeightedAssignee(
        [
          { userId: "full", weight: 100, openCount: 0 },
          { userId: "poster", weight: 20, openCount: 0 },
        ],
        () => i / 1000,
      );
      if (pick === "full") counts.full++;
      if (pick === "poster") counts.poster++;
    }
    assert.ok(counts.full > counts.poster);
    assert.ok(counts.poster > 0);
  });
});
