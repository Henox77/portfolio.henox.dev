import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bridgeColors,
  bridgeLit,
  bridgeOnHour,
  dayKey,
} from "./bridge";

/** A Date at a given Istanbul wall-clock time on a given day (UTC+3). */
const ist = (y: number, mo: number, d: number, h: number, mi = 0) =>
  new Date(Date.UTC(y, mo - 1, d, h - 3, mi));

describe("bridgeOnHour", () => {
  it("comes on between 20:00 and 20:30 in high summer", () => {
    for (const d of [15, 21, 28]) {
      const h = bridgeOnHour(ist(2026, 6, d, 12));
      assert.ok(h >= 19.95 && h <= 20.5, `June ${d}: ${h}`);
    }
  });

  it("comes on between 17:00 and 17:30 in midwinter", () => {
    for (const d of [15, 21, 28]) {
      const h = bridgeOnHour(ist(2026, 12, d, 12));
      assert.ok(h >= 17 && h <= 17.55, `December ${d}: ${h}`);
    }
  });

  it("is the same moment all day, and differs from day to day", () => {
    assert.equal(
      bridgeOnHour(ist(2026, 10, 31, 9)),
      bridgeOnHour(ist(2026, 10, 31, 22)),
    );
    const days = new Set(
      [1, 2, 3, 4, 5].map((d) => bridgeOnHour(ist(2026, 3, d, 12)).toFixed(3)),
    );
    assert.ok(days.size > 1);
  });
});

describe("bridgeLit", () => {
  it("is off by day and on late at night", () => {
    assert.equal(bridgeLit(ist(2026, 1, 10, 14)), false);
    assert.equal(bridgeLit(ist(2026, 1, 10, 23)), true);
    assert.equal(bridgeLit(ist(2026, 1, 11, 3)), true);
  });

  it("is off at 19:30 in summer and on at 21:00", () => {
    assert.equal(bridgeLit(ist(2026, 6, 21, 19, 30)), false);
    assert.equal(bridgeLit(ist(2026, 6, 21, 21)), true);
  });
});

describe("bridgeColors", () => {
  it("goes red and white on 15 Temmuz", () => {
    assert.deepEqual(bridgeColors(ist(2026, 7, 15, 22)), ["#e30a17", "#ffffff"]);
  });

  it("keys the day in Istanbul time, not UTC", () => {
    // 01:30 in Istanbul is still the previous day in UTC.
    assert.equal(dayKey(ist(2026, 7, 16, 1, 30)), 20260716);
  });
});
