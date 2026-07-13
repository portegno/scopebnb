/**
 * Deterministic demo forecast — a realistic-looking week for previewing
 * <SkyForecast /> without hitting Open-Meteo / 7Timer, and the fallback when the
 * live request fails. Dates roll from "today" (computed at module load) so the
 * fixture never shows stale calendar dates; the moon is the genuine phase for
 * each date. Only the weather numbers are synthetic.
 *
 * Kept strictly separate from the UI: the component renders whatever
 * `ForecastDay[]` it's handed, demo or live. No randomness (stable per server
 * lifetime); curves are sine-shaped so cells read naturally.
 */
import type { ForecastDay, ForecastHour } from "@/lib/weather";
import { isImagingNight, moonIllumination } from "@/lib/visibility";
import { site } from "@/config/site";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 0–1 deterministic wobble from two integers. */
const wob = (a: number, b: number) => (Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const toJD = (epochMs: number) => epochMs / 86400000 + 2440587.5;

// Local calendar "today" at the observatory as a UTC-midnight anchor (so adding
// whole days keeps the local date correct). Resolved once, at module load.
const OFFSET_MS = site.location.utcOffset * 3_600_000;
const localToday = new Date(Date.now() + OFFSET_MS);
const BASE_DAY_UTC = Date.UTC(localToday.getUTCFullYear(), localToday.getUTCMonth(), localToday.getUTCDate());

function makeHour(dayIdx: number, hour: number): ForecastHour {
  const n = Math.abs(wob(dayIdx + 1, hour + 1));
  // Real UTC instant for this local hour at the observatory, so darkness is the
  // genuine astronomical night for the (rolling) date.
  const epoch = BASE_DAY_UTC + dayIdx * 86_400_000 + (hour - site.location.utcOffset) * 3_600_000;
  const night = isImagingNight(new Date(epoch), site.location);
  // Clearer skies at night on the better days; a cloudy patch mid-week.
  const cloudBias = dayIdx === 2 ? 70 : dayIdx === 5 ? 45 : 12;
  const cloudTotal = clamp(Math.round(cloudBias + (night ? -18 : 14) + n * 30 - 10), 0, 100);
  const tempC = Math.round(12 + 9 * Math.sin(((hour - 9) / 24) * Math.PI * 2) + (dayIdx - 3));
  const humidity = clamp(Math.round(58 + (night ? 16 : -6) + n * 18), 20, 99);

  return {
    epoch,
    hour: String(hour).padStart(2, "0"),
    cloudTotal,
    cloudLow: clamp(Math.round(cloudTotal * 0.5 + n * 10), 0, 100),
    cloudMid: clamp(Math.round(cloudTotal * 0.4 + n * 8), 0, 100),
    cloudHigh: clamp(Math.round(cloudTotal * 0.6 - n * 6), 0, 100),
    visibilityKm: clamp(Math.round(24 - cloudTotal * 0.12), 2, 24),
    humidity,
    dewPointC: Math.round(tempC - (100 - humidity) * 0.2),
    tempC,
    windKmh: clamp(Math.round(6 + n * 26 + (dayIdx === 5 ? 14 : 0)), 0, 50),
    windDir: Math.round(n * 360),
    precipProb: cloudTotal > 70 ? clamp(Math.round(n * 60 + 10), 0, 90) : Math.round(n * 8),
    // 7Timer indices 1–8 (1 = best). Better seeing/transparency on clear nights.
    seeing: clamp(Math.round(2 + cloudTotal * 0.04 + n * 2), 1, 8),
    transparency: clamp(Math.round(1 + cloudTotal * 0.05 + n * 2), 1, 8),
    isDark: night,
  };
}

export const demoForecast: ForecastDay[] = Array.from({ length: 7 }, (_, dayIdx) => {
  const dayUTC = BASE_DAY_UTC + dayIdx * 86_400_000;
  const d = new Date(dayUTC); // getUTC* read back the local calendar date
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const moon = moonIllumination(toJD(dayUTC + 12 * 3_600_000)); // local midday
  return {
    date: `${yyyy}-${mm}-${dd}`,
    label: `${WEEKDAY[d.getUTCDay()]} ${d.getUTCDate()}`,
    moonIllumPct: Math.round(moon.fraction * 100),
    moonPhase: moon.phase,
    hours: Array.from({ length: 24 }, (_, hour) => makeHour(dayIdx, hour)),
  };
});
