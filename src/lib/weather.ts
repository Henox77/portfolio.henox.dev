import type { Daylight } from "./daylight";

/**
 * Real weather in Istanbul, applied to the room's light: cloud kills the hard
 * sun patch and lifts the soft fill, rain puts streaks on the glass, haze eats
 * the skyline.
 *
 * All of it is a *modifier* — the daylight model stands alone, because a
 * decorative API that can fail must never be load-bearing.
 */

export const ISTANBUL = { lat: 41.0082, lon: 28.9784 } as const;

export type Condition =
  | "clear"
  | "cloudy"
  | "overcast"
  | "fog"
  | "rain"
  | "storm"
  | "snow";

export interface Weather {
  tempC: number;
  /** 0..1 */
  cloud: number;
  condition: Condition;
  /** Short human line for the HUD, e.g. "21° parçalı bulutlu". */
  label: string;
}

/** Deliberately coarse: ninety-nine codes collapse into about five states. */
function classify(code: number): Condition {
  if (code >= 95) return "storm";
  if (code >= 80) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 51 && code <= 67) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 3) return "overcast";
  if (code === 1 || code === 2) return "cloudy";
  return "clear";
}

const WORDS: Record<Condition, string> = {
  clear: "açık",
  cloudy: "parçalı bulutlu",
  overcast: "kapalı",
  fog: "puslu",
  rain: "yağmurlu",
  storm: "fırtınalı",
  snow: "karlı",
};

export function readWeather(
  current:
    | {
        temperature_2m?: number;
        weather_code?: number;
        cloud_cover?: number;
      }
    | undefined,
): Weather | null {
  if (!current || current.temperature_2m === undefined) return null;

  const condition = classify(current.weather_code ?? 0);
  const tempC = Math.round(current.temperature_2m);

  return {
    tempC,
    cloud: Math.min(1, Math.max(0, (current.cloud_cover ?? 0) / 100)),
    condition,
    label: `${tempC}° ${WORDS[condition]}`,
  };
}

/** True when there's water on the glass. */
export function isWet(w: Weather | null): boolean {
  return w?.condition === "rain" || w?.condition === "storm";
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) => Math.round(v + (pb[i] - v) * t))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Flat grey-blue. What every colour in the sky collapses toward under cloud. */
const OVERCAST = "#9aa6b0";

export function withWeather(day: Daylight, w: Weather | null): Daylight {
  if (!w) return day;

  const wet = isWet(w);
  const cover = Math.min(
    1,
    Math.max(w.cloud, wet ? 0.95 : w.condition === "fog" ? 0.8 : 0),
  );

  return {
    ...day,
    sunIntensity: day.sunIntensity * (1 - cover * 0.92),
    skyIntensity: day.skyIntensity * (1 + cover * 0.45),
    windowIntensity: day.windowIntensity * (1 - cover * 0.25),
    windowColor: mixHex(day.windowColor, OVERCAST, cover * 0.7),
    sunColor: mixHex(day.sunColor, OVERCAST, cover * 0.5),
    bounceColor: mixHex(day.bounceColor, OVERCAST, cover * 0.4),
  };
}
