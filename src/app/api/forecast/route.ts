import { NextResponse } from "next/server";
import { site } from "@/config/site";
import { buildForecast, type OpenMeteoRaw, type SevenTimerRaw } from "@/lib/weather";

/**
 * Weekly astrophotography sky forecast for the observatory.
 *
 * Combines two free, key-less sources server-side so the browser only ever
 * sees our normalised, pre-rated model (and our keys/quotas stay hidden):
 *   • Open-Meteo   — cloud layers, wind, humidity, dew point, temp, visibility.
 *   • 7Timer ASTRO — seeing & transparency.
 *
 * Cached for 1 hour (`revalidate`) so visitors don't each hit the upstreams.
 */
export const runtime = "nodejs";
export const revalidate = 3600;

const { latitude, longitude } = site.location;

const OPEN_METEO =
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
  `&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,` +
  `relative_humidity_2m,dew_point_2m,temperature_2m,wind_speed_10m,wind_direction_10m,` +
  `precipitation_probability` +
  `&wind_speed_unit=kmh&timeformat=unixtime&timezone=America%2FChicago&forecast_days=7`;

const SEVEN_TIMER =
  `https://www.7timer.info/bin/api.pl?lon=${longitude}&lat=${latitude}&product=astro&output=json`;

export async function GET() {
  try {
    // 7Timer is the flakier upstream — tolerate it being down (astro cells just
    // render as "no data"); Open-Meteo failing is fatal for the grid.
    const [meteoRes, sevenRes] = await Promise.all([
      fetch(OPEN_METEO, { next: { revalidate } }),
      fetch(SEVEN_TIMER, { next: { revalidate } }).catch(() => null),
    ]);

    if (!meteoRes.ok) {
      return NextResponse.json({ error: "Open-Meteo unavailable" }, { status: 502 });
    }

    const openMeteo = (await meteoRes.json()) as OpenMeteoRaw;
    let sevenTimer: SevenTimerRaw | null = null;
    if (sevenRes?.ok) {
      try {
        sevenTimer = (await sevenRes.json()) as SevenTimerRaw;
      } catch {
        sevenTimer = null; // 7Timer occasionally returns non-JSON; degrade gracefully
      }
    }

    const days = buildForecast(openMeteo, sevenTimer);
    return NextResponse.json({ days, generatedAt: Date.now(), source: "open-meteo + 7timer" });
  } catch {
    return NextResponse.json({ error: "forecast failed" }, { status: 500 });
  }
}
