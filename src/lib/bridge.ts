import { istanbulHours, istanbulSun } from "./daylight";

/**
 * When the lights come on across the Bosphorus, out of the window.
 *
 * The 15 Temmuz Şehitler Köprüsü's lighting follows the evening, not the
 * clock: around 20:00–20:30 in summer, when it gets dark late, and around
 * 17:00–17:30 in winter. Between the two it slides with the season, and each
 * day picks its own moment inside that half hour — as does every lit window in
 * the city, so no two evenings come on the same way.
 *
 * Everything random here is seeded by the Istanbul date, so a day is the same
 * day on every reload and every visitor's screen.
 */

const TRT_OFFSET_MS = 3 * 3_600_000;

/** The Istanbul calendar date for an instant. */
export function istanbulDate(now: Date) {
  const t = new Date(now.getTime() + TRT_OFFSET_MS);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth() + 1;
  const d = t.getUTCDate();
  const doy = Math.floor((t.getTime() - Date.UTC(y, 0, 0)) / 86_400_000);
  return { y, m, d, doy };
}

/** YYYYMMDD in Istanbul: the seed for that day's randomness. */
export function dayKey(now: Date): number {
  const { y, m, d } = istanbulDate(now);
  return y * 10_000 + m * 100 + d;
}

/** A small seeded generator: same seed, same sequence. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 0 at the winter solstice, 1 at the summer one. */
export function summerness(now: Date): number {
  const { doy } = istanbulDate(now);
  return 0.5 + 0.5 * Math.cos((2 * Math.PI * (doy - 172)) / 365);
}

/** Istanbul hour, as a float, at which the bridge lights come on today. */
export function bridgeOnHour(now: Date): number {
  const jitter = seeded(dayKey(now) * 7 + 3)();
  return 17 + 3 * summerness(now) + jitter * 0.5;
}

/** True from today's switch-on time until the sun is up again. */
export function bridgeLit(now: Date): boolean {
  const h = istanbulHours(now);
  return h >= bridgeOnHour(now) || h < istanbulSun(now).sunrise;
}

/**
 * Days the bridge goes red and white: 15 Temmuz, the day it is named for, and
 * the national days.
 */
const FLAG_DAYS = new Set(["4-23", "5-19", "7-15", "8-30", "10-29"]);

/** The bridge's LED colours tonight, one for each end of the span. */
const PALETTE: [string, string][] = [
  ["#2f6bff", "#7a4dff"], // blue into violet
  ["#18c9c0", "#2f6bff"], // turquoise into blue
  ["#b14bff", "#ff4da6"], // violet into pink
  ["#ff5a3c", "#ffb03b"], // red into amber
  ["#f4f1ea", "#9fc4ff"], // white into ice
  ["#2fd47a", "#18c9c0"], // green into turquoise
];

export function bridgeColors(now: Date): [string, string] {
  const { m, d } = istanbulDate(now);
  if (FLAG_DAYS.has(`${m}-${d}`)) return ["#e30a17", "#ffffff"];
  const r = seeded(dayKey(now) * 13 + 5)();
  return PALETTE[Math.floor(r * PALETTE.length)];
}
