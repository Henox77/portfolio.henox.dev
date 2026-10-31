/**
 * What the room's light should be doing right now, in Istanbul.
 */

export interface Daylight {
  /** 0 = fully dark, 1 = full daylight. */
  level: number;
  /** Warmth of the window light. Dawn and dusk are gold, midday is blue-white. */
  windowColor: string;
  /** Local glow around the opening itself. */
  windowIntensity: number;
  /** Direct sun, which is what actually casts the window patch. */
  sunColor: string;
  sunIntensity: number;
  /** Soft shadowless daylight arriving from the window's side of the room. */
  skyIntensity: number;
  /** The lamp comes up as the window falls away. */
  lampIntensity: number;
  /**
   * Bias strip and shelf spot.
   */
  nightIntensity: number;
  /** Ambient bounce colour — cool by day, warm at night from the lamp. */
  bounceColor: string;
  bounceIntensity: number;
  /** Local time, for display. */
  label: string;
  /** True when Henox is plausibly asleep, which the UI can note. */
  night: boolean;
}

/** How long the sky takes to turn over, in hours. */
const TWILIGHT = 1.4;

/** Turkey Time (TRT): UTC+3 all year, no daylight saving since 2016. */
const TRT_OFFSET_MS = 3 * 3_600_000;
const DAY_MS = 86_400_000;

const ISTANBUL_LAT = 41.0082;
const ISTANBUL_LON = 28.9784;

/** Hours since Istanbul midnight, as a float. Independent of the viewer's zone. */
export function istanbulHours(now: Date = new Date()): number {
  const ms = (((now.getTime() + TRT_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return ms / 3_600_000;
}

/**
 * Sunrise and sunset in Istanbul for the day `now` falls on, in TRT hours.
 *
 * Fixed hours were wrong by up to two either way: Istanbul runs on permanent
 * summer time, so the sun rises at 08:26 in December and sets at 20:40 in June.
 * Low-precision NOAA approximation — a few minutes out, invisible in a room.
 */
export function istanbulSun(now: Date = new Date()): {
  sunrise: number;
  sunset: number;
} {
  const trt = new Date(now.getTime() + TRT_OFFSET_MS);
  const start = Date.UTC(trt.getUTCFullYear(), 0, 0);
  const day = Math.floor((trt.getTime() - start) / DAY_MS);

  const rad = Math.PI / 180;
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const b = ((2 * Math.PI) / 364) * (day - 81);
  const equationOfTime =
    9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // -0.833° allows for refraction and the sun's radius, the standard definition.
  const cosHour =
    (Math.sin(-0.833 * rad) -
      Math.sin(ISTANBUL_LAT * rad) * Math.sin(declination * rad)) /
    (Math.cos(ISTANBUL_LAT * rad) * Math.cos(declination * rad));
  const halfDay = Math.acos(Math.min(1, Math.max(-1, cosHour))) / rad / 15;

  const noon = 12 + (45 - ISTANBUL_LON) / 15 - equationOfTime / 60;
  return { sunrise: noon - halfDay, sunset: noon + halfDay };
}

/** Backward-compatible alias */
export const istHours = istanbulHours;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mixed = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return "#" + mixed.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const NIGHT_BLUE = "#243a5c";
const GOLDEN = "#ffb066";
const NOON = "#cfe0ff";

export function daylight(now: Date = new Date()): Daylight {
  const h = istanbulHours(now);
  const { sunrise, sunset } = istanbulSun(now);

  // Rises through dawn, falls through dusk.
  const level =
    smoothstep(sunrise - TWILIGHT / 2, sunrise + TWILIGHT, h) *
    (1 - smoothstep(sunset - TWILIGHT, sunset + TWILIGHT / 2, h));

  // Colour isn't a function of level alone: dawn and dusk are both half lit and
  // both gold, where the hours between are blue-white. The band scales with the
  // day, so a short December afternoon still gets its blue-white hour.
  const span = Math.max(3, (sunset - sunrise) / 2.6);
  const midday = smoothstep(0, 1, 1 - Math.abs(h - (sunrise + sunset) / 2) / span);
  const warm = mixHex(GOLDEN, NOON, midday);
  const windowColor = mixHex(NIGHT_BLUE, warm, level);

  const night = level < 0.12;

  return {
    level,
    windowColor,
    // Never zero: a pure-black window reads as a hole rather than as glass.
    windowIntensity: 0.1 + level * 2.4,
    // Shadow-casting
    sunColor: mixHex(GOLDEN, "#fff2df", midday),
    sunIntensity: Math.pow(level, 0.75) * 3.4,
    skyIntensity: level * 1.75,
    lampIntensity: 0.5 + (1 - level) * 3.2,
    nightIntensity: 1 - smoothstep(0.06, 0.42, level),
    bounceColor: mixHex("#3a2c22", "#9fb6d6", level),
    bounceIntensity: 0.07 + level * 0.34,
    label: formatIstanbul(now),
    night,
  };
}

export function formatIstanbul(now: Date = new Date()): string {
  const h = istanbulHours(now);
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Backward-compatible alias */
export const formatIst = formatIstanbul;
