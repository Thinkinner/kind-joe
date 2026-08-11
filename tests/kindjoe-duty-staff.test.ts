import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickAuthoritativeDutyCheckin } from "../lib/admin/kindjoe-duty-staff";
import { isIdleNudgeActiveWindow } from "../lib/admin/idle-nudge";

describe("isIdleNudgeActiveWindow (9pm–7am Manila)", () => {
  it("is active at 9pm and 6am Manila, inactive at 7am and 8pm", () => {
    // 2026-08-06 13:00 UTC = 9:00 PM Manila
    assert.equal(
      isIdleNudgeActiveWindow(new Date("2026-08-06T13:00:00.000Z")).active,
      true,
    );
    // 2026-08-06 14:00 UTC = 10:00 PM Manila
    assert.equal(
      isIdleNudgeActiveWindow(new Date("2026-08-06T14:00:00.000Z")).active,
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
    // 2026-08-06 12:00 UTC = 8:00 PM Manila
    assert.equal(
      isIdleNudgeActiveWindow(new Date("2026-08-06T12:00:00.000Z")).active,
      false,
    );
  });
});

describe("pickAuthoritativeDutyCheckin", () => {
  const base = {
    userId: "beige",
    lastContentAt: null,
    lastNudgeAt: null,
    slackUserId: "U1",
  };

  it("prefers today's not-working over yesterday's Kind Joe", () => {
    const chosen = pickAuthoritativeDutyCheckin(
      [
        {
          ...base,
          id: 1,
          dutyDate: "2026-08-10",
          workingToday: true,
          workingKindJoe: true,
          checkedInAt: "2026-08-10T18:00:00.000Z",
        },
        {
          ...base,
          id: 2,
          dutyDate: "2026-08-11",
          workingToday: false,
          workingKindJoe: false,
          checkedInAt: "2026-08-11T02:00:00.000Z",
        },
      ],
      "2026-08-11",
    );
    assert.equal(chosen?.id, 2);
    assert.equal(chosen?.workingToday, false);
  });

  it("falls back to yesterday when today has no check-in", () => {
    const chosen = pickAuthoritativeDutyCheckin(
      [
        {
          ...base,
          id: 1,
          dutyDate: "2026-08-10",
          workingToday: true,
          workingKindJoe: true,
          checkedInAt: "2026-08-10T18:00:00.000Z",
        },
      ],
      "2026-08-11",
    );
    assert.equal(chosen?.id, 1);
    assert.equal(chosen?.workingKindJoe, true);
  });
});
