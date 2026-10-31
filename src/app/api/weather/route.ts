import { NextResponse } from "next/server";

import { ISTANBUL, readWeather, type Weather } from "@/lib/weather";

/**
 * Open-Meteo, because it needs no key and no account.
 * Configured for Istanbul, Turkey (Europe/Istanbul).
 */
const URL_ =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${ISTANBUL.lat}&longitude=${ISTANBUL.lon}` +
  "&current=temperature_2m,weather_code,cloud_cover,is_day,wind_speed_10m" +
  "&timezone=Europe%2FIstanbul";

export async function GET() {
  try {
    const res = await fetch(URL_, {
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(String(res.status));

    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        cloud_cover?: number;
        is_day?: number;
        wind_speed_10m?: number;
      };
    };

    const weather = readWeather(json.current);
    if (!weather) throw new Error("no current block");

    return NextResponse.json<Weather>(weather, {
      headers: { "cache-control": "public, max-age=600" },
    });
  } catch {
    return NextResponse.json(null, {
      headers: { "cache-control": "public, max-age=120" },
    });
  }
}
