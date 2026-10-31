import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { daylight, formatIstanbul, istanbulHours } from "./daylight";

/** A Date at a given Istanbul wall-clock time, built from the UTC offset (UTC+3). */
const ist = (hours: number, minutes = 0) =>
  new Date(Date.UTC(2026, 7, 16, hours - 3, minutes));

describe("istanbulHours", () => {
  it("converts UTC to Istanbul time (TRT) regardless of the machine's timezone", () => {
    // 00:00 UTC is 03:00 TRT.
    assert.equal(istanbulHours(new Date("2026-08-16T00:00:00Z")), 3);
    assert.equal(istanbulHours(new Date("2026-08-16T21:00:00Z")), 0);
  });

  it("wraps past midnight", () => {
    // 22:00 UTC is 01:00 TRT the next day.
    assert.equal(istanbulHours(new Date("2026-08-16T22:00:00Z")), 1);
  });
});

describe("daylight", () => {
  it("is dark in the small hours", () => {
    const d = daylight(ist(3));
    assert.equal(d.level, 0);
    assert.equal(d.night, true);
  });

  it("is full daylight at midday", () => {
    const d = daylight(ist(13));
    assert.ok(d.level > 0.98, `level was ${d.level}`);
    assert.equal(d.night, false);
  });

  it("rises through dawn and falls through dusk", () => {
    assert.ok(daylight(ist(5)).level < daylight(ist(8)).level);
    assert.ok(daylight(ist(21)).level < daylight(ist(18)).level);
  });

  it("trades the lamp against the window", () => {
    const noon = daylight(ist(13));
    const midnight = daylight(ist(1));
    assert.ok(midnight.lampIntensity > noon.lampIntensity);
    assert.ok(noon.windowIntensity > midnight.windowIntensity);
  });

  it("only casts direct sun while the sun is up", () => {
    assert.equal(daylight(ist(3)).sunIntensity, 0);
    assert.ok(daylight(ist(13)).sunIntensity > 2.5);
  });

  it("switches the room's own lights rather than dimming them", () => {
    assert.equal(daylight(ist(2)).nightIntensity, 1);
    assert.equal(daylight(ist(15)).nightIntensity, 0);
    assert.ok(daylight(ist(9)).nightIntensity === 0);
  });

  it("never lets the window go fully black", () => {
    assert.ok(daylight(ist(2)).windowIntensity > 0);
  });

  it("is gold near the horizon and cooler at noon", () => {
    const red = (hex: string) => parseInt(hex.slice(1, 3), 16);
    const blue = (hex: string) => parseInt(hex.slice(5, 7), 16);
    const dusk = daylight(ist(18)).windowColor;
    const noon = daylight(ist(12, 30)).windowColor;
    assert.ok(red(dusk) - blue(dusk) > red(noon) - blue(noon));
  });

  it("emits a valid hex colour at every hour", () => {
    for (let h = 0; h < 24; h += 0.25) {
      const d = daylight(ist(Math.floor(h), (h % 1) * 60));
      for (const c of [d.windowColor, d.bounceColor, d.sunColor]) {
        assert.match(c, /^#[0-9a-f]{6}$/, `${c} at ${h}h`);
      }
      assert.ok(d.level >= 0 && d.level <= 1);
    }
  });
});

describe("formatIstanbul", () => {
  it("pads to a stable width so the label doesn't jitter", () => {
    assert.equal(formatIstanbul(ist(9, 5)), "09:05");
    assert.equal(formatIstanbul(ist(23, 59)), "23:59");
  });
});
