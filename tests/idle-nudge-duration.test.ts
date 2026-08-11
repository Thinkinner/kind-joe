import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dutyDatesForIdleNudge,
  formatIdleDuration,
  isIdleNudgeActiveWindow,
} from "../lib/admin/idle-nudge";

describe("formatIdleDuration", () => {
  it("formats seconds and minutes", () => {
    assert.equal(formatIdleDuration(1_000), "1 second");
    assert.equal(formatIdleDuration(45_000), "45 seconds");
    assert.equal(formatIdleDuration(60_000), "1 minute");
    assert.equal(formatIdleDuration(150_000), "2 minutes");
  });

  it("always names hours once past 60 minutes", () => {
    assert.equal(formatIdleDuration(60 * 60 * 1000), "1 hour");
    assert.equal(formatIdleDuration(90 * 60 * 1000), "1 hour and 30 minutes");
    assert.equal(formatIdleDuration(2 * 60 * 60 * 1000), "2 hours");
    assert.equal(
      formatIdleDuration(2 * 60 * 60 * 1000 + 15 * 60 * 1000),
      "2 hours and 15 minutes",
    );
    assert.equal(formatIdleDuration(6 * 60 * 60 * 1000), "6 hours");
  });

  it("formats multi-day gaps with hours", () => {
    assert.equal(formatIdleDuration(25 * 60 * 60 * 1000), "1 day and 1 hour");
    assert.equal(formatIdleDuration(48 * 60 * 60 * 1000), "2 days");
  });

  it("handles invalid input", () => {
    assert.equal(formatIdleDuration(Number.NaN), "some time");
    assert.equal(formatIdleDuration(-1000), "some time");
  });
});

describe("isIdleNudgeActiveWindow", () => {
  it("is active at 9pm and 6am Manila, inactive at 7am and noon", () => {
    // 2026-08-06 13:00 UTC = 9:00 PM Manila
    assert.equal(
      isIdleNudgeActiveWindow(new Date("2026-08-06T13:00:00.000Z")).active,
      true,
    );
    // 2026-08-06 22:30 UTC = 6:30 AM Manila
    assert.equal(
      isIdleNudgeActiveWindow(new Date("2026-08-06T22:30:00.000Z")).active,
      true,
    );
    // 2026-08-06 23:00 UTC = 7:00 AM Manila
    assert.equal(
      isIdleNudgeActiveWindow(new Date("2026-08-06T23:00:00.000Z")).active,
      false,
    );
    // 2026-08-07 04:00 UTC = 12:00 PM Manila
    assert.equal(
      isIdleNudgeActiveWindow(new Date("2026-08-07T04:00:00.000Z")).active,
      false,
    );
  });
});

describe("dutyDatesForIdleNudge", () => {
  it("returns one or two LA calendar dates", () => {
    const dates = dutyDatesForIdleNudge(new Date("2026-08-07T22:00:00.000Z"));
    assert.ok(dates.length === 1 || dates.length === 2);
    assert.match(dates[0]!, /^\d{4}-\d{2}-\d{2}$/);
  });
});
