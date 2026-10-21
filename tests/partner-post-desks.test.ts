import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePartnerPostDesk } from "../lib/partner/post-desks";

describe("partner post desks", () => {
  it("maps every local desk alias", () => {
    assert.equal(resolvePartnerPostDesk("ventura"), "ventura");
    assert.equal(resolvePartnerPostDesk("ventura-county"), "ventura");
    assert.equal(resolvePartnerPostDesk("la"), "la");
    assert.equal(resolvePartnerPostDesk("joeknowsla"), "la");
    assert.equal(resolvePartnerPostDesk("oxnard-news"), "oxnard");
    assert.equal(resolvePartnerPostDesk("cityofox"), "oxnard");
    assert.equal(resolvePartnerPostDesk("slo"), "slo");
    assert.equal(resolvePartnerPostDesk("joefromslo"), "slo");
    assert.equal(resolvePartnerPostDesk("kindjoe"), "kindjoe");
    assert.equal(resolvePartnerPostDesk("posts"), "kindjoe");
  });

  it("rejects an unknown desk", () => {
    assert.equal(resolvePartnerPostDesk("miami"), null);
    assert.equal(resolvePartnerPostDesk(""), null);
  });
});
