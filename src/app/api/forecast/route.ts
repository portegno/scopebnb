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
 * The route itself is dynamic (`revalidate = 0`) so the 7-day window always
 * starts at *today* — caching the whole response (e.g. `revalidate = 3600`)
 * emits a year-long stale-while-revalidate window on the CDN, which froze the
 * grid at the build-day's dates in production. Only the UPSTREAM fetches are
 * cached (1 h, via `next.revalidate`), so visitors still don't each hit
 * Open-Meteo / 7Timer, but the dates roll forward on every request.
 */
export const runtime = "nodejs";
export const revalidate = 0;

// Upstream data is fine for an hour; positive per-fetch revalidate is left as-is
// even though the route is dynamic, so these responses stay in the Data Cache.
const UPSTREAM_REVALIDATE = 3600;

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
      fetch(OPEN_METEO, { next: { revalidate: UPSTREAM_REVALIDATE } }),
      fetch(SEVEN_TIMER, { next: { revalidate: UPSTREAM_REVALIDATE } }).catch(() => null),
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

    const days = buildForecast(openMeteo, sevenTimer, {
      // Real astronomical night (Sun below −18°) for the observatory — shifts
      // and widens/narrows with the season instead of a fixed hour window.
      loc: {
        latitude: site.location.latitude,
        longitude: site.location.longitude,
        utcOffset: site.location.utcOffset,
      },
    });
    return NextResponse.json({ days, generatedAt: Date.now(), source: "open-meteo + 7timer" });
  } catch {
    return NextResponse.json({ error: "forecast failed" }, { status: 500 });
  }
}
