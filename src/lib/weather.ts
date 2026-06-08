/**
 * Astrophotography sky-forecast engine.
 *
 * Normalises two free, no-key data sources into a single weekly model and
 * rates every metric for imaging quality — so the UI only ever sees clean,
 * pre-coloured data (never raw provider JSON).
 *
 *   • Open-Meteo  → cloud layers, wind, humidity, dew point, temp, visibility.
 *   • 7Timer ASTRO → seeing & transparency (the astro-specific numbers
 *                     Open-Meteo doesn't have).
 *   • Moon phase   → computed locally via @/lib/visibility (no extra source).
 *
 * Pure module: no `fetch`, no I/O. The API route does the network calls and
 * hands the raw JSON to `buildForecast`. Keep thresholds/colours here — tweak
 * imaging quality rules in one place, not in components.
 */
import { moonIllumination, isImagingNight, type ObservatoryLoc } from "@/lib/visibility";

// ─────────────────────────────────────────────────────────────────────────────
// Normalised model (the only shape the UI knows about)
// ─────────────────────────────────────────────────────────────────────────────

/** Imaging quality of a single cell. `none` = data missing for that hour. */
export type Tier = "excellent" | "good" | "fair" | "poor" | "none";

export type ForecastHour = {
  /** UTC epoch (ms) of the slot start. */
  epoch: number;
  /** Local hour label, "00".."23". */
  hour: string;
  cloudTotal: number; // %
  cloudLow: number; // %
  cloudMid: number; // %
  cloudHigh: number; // %
  visibilityKm: number | null;
  humidity: number | null; // %
  dewPointC: number | null;
  tempC: number | null;
  windKmh: number | null;
  windDir: number | null; // meteorological degrees
  precipProb: number | null; // %
  /** 7Timer seeing index 1–8 (1 = best, sub-arcsecond). */
  seeing: number | null;
  /** 7Timer transparency index 1–8 (1 = best). */
  transparency: number | null;
  /** True while the Sun is below the astronomical-twilight limit. */
  isDark: boolean;
};

export type ForecastDay = {
  /** Local calendar date, "YYYY-MM-DD". */
  date: string;
  /** Short weekday + day-of-month, e.g. "Thu 5". */
  label: string;
  moonIllumPct: number; // 0–100
  moonPhase: string; // "New moon" … "Full moon"
  hours: ForecastHour[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Quality rating — astrophotography thresholds, one row per metric
// ─────────────────────────────────────────────────────────────────────────────

/** A metric row in the grid: how to read a value, format it, and rate it. */
export type MetricRow = {
  key: string;
  label: string;
  /** Pull the raw value for an hour (may be null when a source is missing). */
  value: (h: ForecastHour) => number | null;
  /** Human cell text. */
  format: (v: number | null) => string;
  /** Imaging quality of that value. */
  rate: (v: number | null) => Tier;
};

/** Lower-is-better banding helper (clouds, wind, humidity, seeing…). */
function bandLow(v: number | null, exc: number, good: number, fair: number): Tier {
  if (v === null || Number.isNaN(v)) return "none";
  if (v <= exc) return "excellent";
  if (v <= good) return "good";
  if (v <= fair) return "fair";
  return "poor";
}

/** Higher-is-better banding helper (visibility). */
function bandHigh(v: number | null, exc: number, good: number, fair: number): Tier {
  if (v === null || Number.isNaN(v)) return "none";
  if (v >= exc) return "excellent";
  if (v >= good) return "good";
  if (v >= fair) return "fair";
  return "poor";
}

const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v)}`);

/**
 * The grid's rows, in display order. This array IS the spec — reorder, retune,
 * or drop rows here and the whole grid follows.
 */
export const METRIC_ROWS: MetricRow[] = [
  {
    key: "cloudTotal",
    label: "Total cloud",
    value: (h) => h.cloudTotal,
    format: pct,
    rate: (v) => bandLow(v, 10, 30, 60),
  },
  {
    key: "cloudLow",
    label: "Low cloud",
    value: (h) => h.cloudLow,
    format: pct,
    rate: (v) => bandLow(v, 10, 30, 60),
  },
  {
    key: "cloudMid",
    label: "Mid cloud",
    value: (h) => h.cloudMid,
    format: pct,
    rate: (v) => bandLow(v, 10, 30, 60),
  },
  {
    key: "cloudHigh",
    label: "High cloud",
    value: (h) => h.cloudHigh,
    format: pct,
    rate: (v) => bandLow(v, 10, 30, 60),
  },
  {
    key: "seeing",
    label: "Seeing",
    value: (h) => h.seeing,
    // 7Timer index → arcsec band label (1=best). Show the index; colour by it.
    format: (v) => (v === null ? "–" : `${v}`),
    rate: (v) => bandLow(v, 2, 3, 5),
  },
  {
    key: "transparency",
    label: "Transparency",
    value: (h) => h.transparency,
    format: (v) => (v === null ? "–" : `${v}`),
    rate: (v) => bandLow(v, 2, 3, 5),
  },
  {
    key: "visibilityKm",
    label: "Visibility",
    value: (h) => h.visibilityKm,
    format: (v) => (v === null ? "–" : `${Math.round(v)}`),
    rate: (v) => bandHigh(v, 20, 10, 5),
  },
  {
    key: "windKmh",
    label: "Wind km/h",
    value: (h) => h.windKmh,
    format: (v) => (v === null ? "–" : `${Math.round(v)}`),
    rate: (v) => bandLow(v, 10, 20, 35),
  },
  {
    key: "humidity",
    label: "Humidity",
    value: (h) => h.humidity,
    format: pct,
    rate: (v) => bandLow(v, 70, 80, 90),
  },
  {
    key: "dewPointC",
    label: "Dew °C",
    value: (h) => h.dewPointC,
    format: (v) => (v === null ? "–" : `${Math.round(v)}`),
    // Dew point itself isn't good/bad in isolation; show it neutral-ish by
    // banding on absolute value only loosely (cold + dry nights image best).
    rate: (v) => bandLow(v, 5, 12, 18),
  },
  {
    key: "tempC",
    label: "Temp °C",
    value: (h) => h.tempC,
    format: (v) => (v === null ? "–" : `${Math.round(v)}`),
    // Neutral metric — always render as "good" so it reads as informational.
    rate: (v) => (v === null ? "none" : "good"),
  },
  {
    key: "precipProb",
    label: "Precip %",
    value: (h) => h.precipProb,
    format: (v) => (v === null ? "–" : `${Math.round(v)}`),
    rate: (v) => bandLow(v, 5, 20, 50),
  },
];

/** Hover explanation per metric — what's good and what to expect. Keyed by row key. */
export const METRIC_HELP: Record<string, string> = {
  cloudTotal: "Total cloud cover (%). Lower is better: under ~20% is clear; over 60% usually kills the night.",
  cloudLow: "Low-altitude cloud (%). The most disruptive layer: even 20–30% can block your target.",
  cloudMid: "Mid-level cloud (%). Lower is better; thick mid cloud hides faint detail.",
  cloudHigh: "High thin cloud (%). Less blocking than low cloud, but softens contrast.",
  seeing: "Atmospheric steadiness (1–8, lower is better). 1–2 = sharp, sub-arcsecond; 5+ = blurry, poor for planets & small galaxies.",
  transparency: "Sky clarity / darkness (1–8, lower is better). 1–2 = very transparent for faint nebulae; 5+ = hazy.",
  visibilityKm: "Horizontal visibility (km, higher is better). 20+ km is crisp; under 5 km means haze or fog.",
  windKmh: "Wind speed (km/h). Under 10 is ideal; over ~35 shakes the scope and trails stars.",
  humidity: "Relative humidity (%). Under ~70% is good; over ~90% risks dew forming on the optics.",
  dewPointC: "Dew point (°C). The closer the air temperature gets to it, the higher the dew/condensation risk on the optics.",
  tempC: "Air temperature (°C). Informational: affects cooling and dew, not image quality directly.",
  precipProb: "Chance of precipitation (%). Anything above a few % is a red flag for the session.",
};

/** Cell colours per tier — echo the Clear Outside green→red, on the dark theme. */
export const TIER_STYLE: Record<Tier, { bg: string; fg: string }> = {
  excellent: { bg: "#1f9d57", fg: "#04140b" },
  good: { bg: "#9bbf3c", fg: "#0d1403" },
  fair: { bg: "#e0a23a", fg: "#170f02" },
  poor: { bg: "#d34a3c", fg: "#fbe9e7" },
  none: { bg: "#161c30", fg: "#5b658a" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Raw source shapes + parsers (pure — fed by the API route)
// ─────────────────────────────────────────────────────────────────────────────

/** Subset of Open-Meteo's response we consume (request with timeformat=unixtime). */
export type OpenMeteoRaw = {
  utc_offset_seconds: number;
  hourly: {
    time: number[]; // unix seconds, UTC
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility?: number[]; // metres
    relative_humidity_2m?: number[];
    dew_point_2m?: number[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    precipitation_probability?: number[];
  };
};

/** Subset of 7Timer ASTRO response. */
export type SevenTimerRaw = {
  init: string; // "YYYYMMDDHH" in UTC
  dataseries: Array<{
    timepoint: number; // hours after init (3-hour steps)
    seeing?: number; // index 1–8
    transparency?: number; // index 1–8
  }>;
};

const at = (arr: number[] | undefined, i: number): number | null =>
  arr && arr[i] !== undefined && arr[i] !== null ? arr[i] : null;

/** Parse 7Timer init "YYYYMMDDHH" (UTC) to an epoch (ms). */
function initEpoch(init: string): number {
  const y = +init.slice(0, 4);
  const mo = +init.slice(4, 6) - 1;
  const d = +init.slice(6, 8);
  const h = +init.slice(8, 10);
  return Date.UTC(y, mo, d, h);
}

/**
 * Build a lookup from epoch → { seeing, transparency } using nearest 3-hour
 * 7Timer sample (within 90 min), so any hourly slot can find its astro values.
 */
function sevenTimerIndex(seven: SevenTimerRaw | null): Map<number, { seeing: number | null; transparency: number | null }> {
  const map = new Map<number, { seeing: number | null; transparency: number | null }>();
  if (!seven?.dataseries) return map;
  const base = initEpoch(seven.init);
  for (const d of seven.dataseries) {
    const epoch = base + d.timepoint * 3600_000;
    map.set(epoch, {
      seeing: d.seeing ?? null,
      transparency: d.transparency ?? null,
    });
  }
  return map;
}

/** Nearest 7Timer sample within ±90 min of an epoch. */
function nearestAstro(
  idx: Map<number, { seeing: number | null; transparency: number | null }>,
  epoch: number,
): { seeing: number | null; transparency: number | null } {
  let best: { seeing: number | null; transparency: number | null } | null = null;
  let bestDist = Infinity;
  for (const [e, v] of idx) {
    const dist = Math.abs(e - epoch);
    if (dist < bestDist) {
      bestDist = dist;
      best = v;
    }
  }
  return bestDist <= 90 * 60_000 && best ? best : { seeing: null, transparency: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Combine → weekly model
// ─────────────────────────────────────────────────────────────────────────────

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Julian Date from epoch (ms), matching @/lib/visibility's convention. */
const toJD = (epochMs: number) => epochMs / 86400000 + 2440587.5;

/**
 * Merge the two sources into `ForecastDay[]`, grouped by the observatory's
 * local calendar day. Each slot's `isDark` flag marks astronomical darkness so
 * the UI can dim daytime columns. Pass `loc` to compute REAL astronomical night
 * (Sun below −18°) — it shifts and widens/narrows with the season; without it
 * we fall back to a fixed local-hour window.
 */
export function buildForecast(
  openMeteo: OpenMeteoRaw,
  sevenTimer: SevenTimerRaw | null,
  opts: { darkFrom?: number; darkTo?: number; loc?: ObservatoryLoc } = {},
): ForecastDay[] {
  const { darkFrom = 21, darkTo = 6, loc } = opts; // fixed-window fallback hours
  const offsetMs = openMeteo.utc_offset_seconds * 1000;
  const astro = sevenTimerIndex(sevenTimer);
  const H = openMeteo.hourly;

  const byDate = new Map<string, ForecastDay>();

  for (let i = 0; i < H.time.length; i++) {
    const epoch = H.time[i] * 1000; // UTC
    const local = new Date(epoch + offsetMs); // shift so UTC getters read local
    const y = local.getUTCFullYear();
    const mo = String(local.getUTCMonth() + 1).padStart(2, "0");
    const d = String(local.getUTCDate()).padStart(2, "0");
    const dateKey = `${y}-${mo}-${d}`;
    const localHour = local.getUTCHours();

    const a = nearestAstro(astro, epoch);
    const vis = at(H.visibility, i);

    const hour: ForecastHour = {
      epoch,
      hour: String(localHour).padStart(2, "0"),
      cloudTotal: H.cloud_cover[i] ?? 0,
      cloudLow: H.cloud_cover_low[i] ?? 0,
      cloudMid: H.cloud_cover_mid[i] ?? 0,
      cloudHigh: H.cloud_cover_high[i] ?? 0,
      visibilityKm: vis === null ? null : vis / 1000,
      humidity: at(H.relative_humidity_2m, i),
      dewPointC: at(H.dew_point_2m, i),
      tempC: at(H.temperature_2m, i),
      windKmh: at(H.wind_speed_10m, i),
      windDir: at(H.wind_direction_10m, i),
      precipProb: at(H.precipitation_probability, i),
      seeing: a.seeing,
      transparency: a.transparency,
      isDark: loc
        ? isImagingNight(new Date(epoch), loc)
        : darkFrom > darkTo
          ? localHour >= darkFrom || localHour < darkTo
          : localHour >= darkFrom && localHour < darkTo,
    };

    let day = byDate.get(dateKey);
    if (!day) {
      const moon = moonIllumination(toJD(epoch));
      day = {
        date: dateKey,
        label: `${WEEKDAY[local.getUTCDay()]} ${local.getUTCDate()}`,
        moonIllumPct: Math.round(moon.fraction * 100),
        moonPhase: moon.phase,
        hours: [],
      };
      byDate.set(dateKey, day);
    }
    day.hours.push(hour);
  }

  return [...byDate.values()];
}
