/**
 * Real (low-precision) target-visibility engine for a fixed observatory.
 * No dependencies. Computes how high a deep-sky object climbs during
 * astronomical darkness on a given night, from the site's coordinates.
 *
 * Accuracy is ~arcminute-class for the Sun and good enough to rank what's
 * actually imageable "this week" — not for telescope pointing.
 */
import type { Target } from "@/data/targets";

const DEG = Math.PI / 180;
const ALT_MIN = 30; // degrees — usable imaging altitude (less atmosphere)
const SUN_DARK = -18; // astronomical twilight

export type ObservatoryLoc = {
  latitude: number;
  longitude: number;
  utcOffset: number;
};

export type Visibility = {
  maxAltitude: number; // peak altitude during astro dark (deg)
  darkHours: number; // hours spent above ALT_MIN during astro dark
  transitAltitude: number; // culmination altitude (deg), season-independent
  bestTimeLocal: string | null; // local HH:MM of peak altitude during dark
  rating: "prime" | "good" | "low" | "none";
};

/** Julian Date from a JS Date. */
function toJD(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Greenwich Mean Sidereal Time in degrees. */
function gmst(jd: number): number {
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
}

/** Low-precision solar equatorial coordinates (deg). */
function sunEqu(jd: number): { ra: number; dec: number } {
  const n = jd - 2451545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n);
  const lambda = (L + 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG)) * DEG;
  const eps = (23.439 - 0.0000004 * n) * DEG;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / DEG;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) / DEG;
  return { ra: norm360(ra), dec };
}

/** Altitude (deg) of an equatorial position at a given instant. */
function altitude(raDeg: number, decDeg: number, latDeg: number, lonDeg: number, jd: number): number {
  const lst = norm360(gmst(jd) + lonDeg);
  const ha = (lst - raDeg) * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
}

/** Sun-altitude limit for "imaging night available". Looser than full
 *  astronomical dark (−18°) since usable imaging already starts in late
 *  (nautical) twilight; −12° widens the window without including bright sky. */
export const IMAGING_NIGHT_SUN_ALT = -10;

/**
 * True when the Sun is below `sunBelowDeg` at the given instant and location —
 * i.e. it's dark enough to image. Defaults to nautical twilight (−12°); pass
 * −18 for strict astronomical darkness. Varies with season and latitude:
 * short summer nights, long winter nights.
 */
export function isImagingNight(
  date: Date,
  loc: ObservatoryLoc,
  sunBelowDeg: number = IMAGING_NIGHT_SUN_ALT,
): boolean {
  const jd = toJD(date);
  const sun = sunEqu(jd);
  return altitude(sun.ra, sun.dec, loc.latitude, loc.longitude, jd) < sunBelowDeg;
}

/** UTC milliseconds for a local wall-clock hour on a local calendar date. */
function localToUtcMs(y: number, m: number, d: number, hour: number, utcOffset: number): number {
  return Date.UTC(y, m, d, 0, 0, 0, 0) + (hour - utcOffset) * 3600000;
}

/**
 * Visibility of one target for the night that starts on the local date of `now`.
 * Samples from local 18:00 through next-morning 08:00.
 */
export function computeVisibility(target: Target, now: Date, loc: ObservatoryLoc): Visibility {
  return computeVisibilityRaDec(target.ra, target.dec, now, loc);
}

export function computeVisibilityRaDec(
  ra: number,
  dec: number,
  now: Date,
  loc: ObservatoryLoc,
): Visibility {
  // Observatory-local calendar date of `now`.
  const localNow = new Date(now.getTime() + loc.utcOffset * 3600000);
  const y = localNow.getUTCFullYear();
  const m = localNow.getUTCMonth();
  const d = localNow.getUTCDate();

  const stepMin = 10;
  let maxAlt = -90;
  let bestMs = 0;
  let darkSamplesAbove = 0;

  for (let hour = 18; hour <= 32; hour += stepMin / 60) {
    const ms = localToUtcMs(y, m, d, hour, loc.utcOffset);
    const jd = toJD(new Date(ms));
    const sun = sunEqu(jd);
    const sunAlt = altitude(sun.ra, sun.dec, loc.latitude, loc.longitude, jd);
    if (sunAlt >= SUN_DARK) continue; // not astronomically dark
    const alt = altitude(ra, dec, loc.latitude, loc.longitude, jd);
    if (alt > maxAlt) {
      maxAlt = alt;
      bestMs = ms;
    }
    if (alt >= ALT_MIN) darkSamplesAbove += 1;
  }

  const darkHours = +(darkSamplesAbove * (stepMin / 60)).toFixed(1);
  const transitAltitude = +(90 - Math.abs(loc.latitude - dec)).toFixed(0);

  let bestTimeLocal: string | null = null;
  if (maxAlt > -90 && bestMs) {
    const local = new Date(bestMs + loc.utcOffset * 3600000);
    bestTimeLocal = `${String(local.getUTCHours()).padStart(2, "0")}:${String(
      local.getUTCMinutes(),
    ).padStart(2, "0")}`;
  }

  let rating: Visibility["rating"] = "none";
  if (darkHours >= 3 && maxAlt >= 45) rating = "prime";
  else if (darkHours >= 1.5) rating = "good";
  else if (maxAlt >= ALT_MIN) rating = "low";

  return {
    maxAltitude: Math.max(0, +maxAlt.toFixed(0)),
    darkHours,
    transitAltitude,
    bestTimeLocal,
    rating,
  };
}

/** Sun ecliptic longitude (deg), for moon-phase/elongation math. */
function sunEclipticLon(jd: number): number {
  const n = jd - 2451545.0;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n);
  return norm360(L + 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG));
}

/** Low-precision lunar equatorial position (deg) + ecliptic longitude. */
function moonEqu(jd: number): { ra: number; dec: number; lon: number } {
  const d = jd - 2451543.5;
  let N = norm360(125.1228 - 0.0529538083 * d);
  const i = 5.1454;
  let w = norm360(318.0634 + 0.1643573223 * d);
  const a = 60.2666;
  const e = 0.0549;
  const M = norm360(115.3654 + 13.0649929509 * d);

  // Eccentric anomaly (iterate Kepler).
  let E = M + (180 / Math.PI) * e * Math.sin(M * DEG) * (1 + e * Math.cos(M * DEG));
  for (let it = 0; it < 6; it++) {
    const dE =
      (E - (180 / Math.PI) * e * Math.sin(E * DEG) - M) / (1 - e * Math.cos(E * DEG));
    E -= dE;
    if (Math.abs(dE) < 1e-4) break;
  }

  const xv = a * (Math.cos(E * DEG) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E * DEG);
  const v = Math.atan2(yv, xv) / DEG;
  const r = Math.sqrt(xv * xv + yv * yv);

  N *= DEG;
  w = (v + w) * DEG;
  const ir = i * DEG;
  const xh = r * (Math.cos(N) * Math.cos(w) - Math.sin(N) * Math.sin(w) * Math.cos(ir));
  const yh = r * (Math.sin(N) * Math.cos(w) + Math.cos(N) * Math.sin(w) * Math.cos(ir));
  const zh = r * (Math.sin(w) * Math.sin(ir));

  const lon = norm360(Math.atan2(yh, xh) / DEG);
  const lat = Math.atan2(zh, Math.sqrt(xh * xh + yh * yh)) / DEG;
  const ecl = (23.4393 - 3.563e-7 * d) * DEG;

  const lr = lon * DEG;
  const br = lat * DEG;
  const xe = Math.cos(lr) * Math.cos(br);
  const ye = Math.sin(lr) * Math.cos(br) * Math.cos(ecl) - Math.sin(br) * Math.sin(ecl);
  const ze = Math.sin(lr) * Math.cos(br) * Math.sin(ecl) + Math.sin(br) * Math.cos(ecl);

  return {
    ra: norm360(Math.atan2(ye, xe) / DEG),
    dec: Math.atan2(ze, Math.sqrt(xe * xe + ye * ye)) / DEG,
    lon,
  };
}

/** Moon illuminated fraction (0–1) and a phase label for an instant. */
export function moonIllumination(jd: number): { fraction: number; phase: string } {
  const elong = norm360(moonEqu(jd).lon - sunEclipticLon(jd));
  const e = elong > 180 ? 360 - elong : elong;
  const fraction = (1 - Math.cos(e * DEG)) / 2;
  const waxing = elong <= 180;
  let phase: string;
  if (e < 10) phase = "New moon";
  else if (e > 170) phase = "Full moon";
  else if (Math.abs(e - 90) < 12) phase = waxing ? "First quarter" : "Last quarter";
  else if (e < 90) phase = waxing ? "Waxing crescent" : "Waning crescent";
  else phase = waxing ? "Waxing gibbous" : "Waning gibbous";
  return { fraction, phase };
}

/**
 * Moon state relative to a target at a given instant — illumination, phase,
 * angular separation, and waxing/waning trend. Computed from first principles
 * (no external service), for the session report's moon facts.
 */
export function moonState(
  raDeg: number,
  decDeg: number,
  when: Date,
): { illumPct: number; phase: string; separationDeg: number; trend: "up" | "down" } {
  const jd = toJD(when);
  const { fraction, phase } = moonIllumination(jd);
  const moon = moonEqu(jd);
  return {
    illumPct: Math.round(fraction * 100),
    phase,
    separationDeg: Math.round(angularSep(raDeg, decDeg, moon.ra, moon.dec)),
    trend: phase.startsWith("Waxing") || phase === "First quarter" ? "up" : "down",
  };
}

/** Angular separation (deg) between two equatorial positions. */
function angularSep(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const a =
    Math.sin(dec1 * DEG) * Math.sin(dec2 * DEG) +
    Math.cos(dec1 * DEG) * Math.cos(dec2 * DEG) * Math.cos((ra1 - ra2) * DEG);
  return Math.acos(Math.max(-1, Math.min(1, a))) / DEG;
}

export type CurvePoint = {
  hour: number; // continuous local hour, 17..32 (32 = 08:00 next day)
  label: string; // "HH:00"
  alt: number; // target altitude, clamped ≥ 0
  sunAlt: number;
  moonAlt: number;
};

export type AltitudeCurve = {
  points: CurvePoint[];
  startHour: number;
  endHour: number;
  darkStart: number | null; // astronomical darkness window (local hours)
  darkEnd: number | null;
  nightStart: number | null; // sun below horizon
  nightEnd: number | null;
};

/** Altitude-vs-time curve for the night that starts on the local date of `now`. */
export function altitudeCurve(
  ra: number,
  dec: number,
  now: Date,
  loc: ObservatoryLoc,
): AltitudeCurve {
  const localNow = new Date(now.getTime() + loc.utcOffset * 3600000);
  const y = localNow.getUTCFullYear();
  const m = localNow.getUTCMonth();
  const d = localNow.getUTCDate();

  const startHour = 17;
  const endHour = 32;
  const step = 0.2;
  const points: CurvePoint[] = [];
  let darkStart: number | null = null;
  let darkEnd: number | null = null;
  let nightStart: number | null = null;
  let nightEnd: number | null = null;

  for (let hour = startHour; hour <= endHour + 1e-9; hour += step) {
    const ms = localToUtcMs(y, m, d, hour, loc.utcOffset);
    const jd = toJD(new Date(ms));
    const sun = sunEqu(jd);
    const moon = moonEqu(jd);
    const sunAlt = altitude(sun.ra, sun.dec, loc.latitude, loc.longitude, jd);
    const moonAlt = altitude(moon.ra, moon.dec, loc.latitude, loc.longitude, jd);
    const alt = Math.max(0, altitude(ra, dec, loc.latitude, loc.longitude, jd));
    const hh = ((Math.round(hour) % 24) + 24) % 24;

    if (sunAlt < SUN_DARK) {
      if (darkStart === null) darkStart = hour;
      darkEnd = hour;
    }
    if (sunAlt < 0) {
      if (nightStart === null) nightStart = hour;
      nightEnd = hour;
    }
    points.push({
      hour,
      label: `${String(hh).padStart(2, "0")}:00`,
      alt: +alt.toFixed(1),
      sunAlt: +sunAlt.toFixed(1),
      moonAlt: +moonAlt.toFixed(1),
    });
  }

  return { points, startHour, endHour, darkStart, darkEnd, nightStart, nightEnd };
}

/**
 * Longest contiguous window (local hours, 17..32) where the target is above
 * the usable altitude AND the sky is astronomically dark — i.e. when it can
 * actually be imaged tonight.
 */
export function imageableWindow(
  ra: number,
  dec: number,
  now: Date,
  loc: ObservatoryLoc,
): { start: number; end: number; hours: number } | null {
  const localNow = new Date(now.getTime() + loc.utcOffset * 3600000);
  const y = localNow.getUTCFullYear();
  const m = localNow.getUTCMonth();
  const d = localNow.getUTCDate();

  const step = 0.1;
  let best: { start: number; end: number } | null = null;
  let runStart: number | null = null;
  let prev = 17;

  for (let hour = 17; hour <= 32 + 1e-9; hour += step) {
    const jd = toJD(new Date(localToUtcMs(y, m, d, hour, loc.utcOffset)));
    const sun = sunEqu(jd);
    const dark = altitude(sun.ra, sun.dec, loc.latitude, loc.longitude, jd) < SUN_DARK;
    const high = altitude(ra, dec, loc.latitude, loc.longitude, jd) >= ALT_MIN;
    const ok = dark && high;
    if (ok && runStart === null) runStart = hour;
    if ((!ok || hour > 32 - step) && runStart !== null) {
      const end = ok ? hour : prev;
      if (!best || end - runStart > best.end - best.start) best = { start: runStart, end };
      runStart = null;
    }
    prev = hour;
  }

  if (!best) return null;
  return { start: +best.start.toFixed(2), end: +best.end.toFixed(2), hours: +(best.end - best.start).toFixed(1) };
}

export type Factor = { label: string; detail: string; status: "good" | "warn" | "bad" };

export type Assessment = {
  visible: boolean;
  rating: "excellent" | "good" | "fair" | "poor";
  headline: string;
  maxAltitude: number;
  darkHours: number;
  bestTimeLocal: string | null;
  moon: { illumPct: number; phase: string; separationDeg: number; upDuringDark: boolean };
  factors: Factor[];
};

/** Quality assessment for a target on the given night, factoring in the Moon. */
export function assessConditions(
  ra: number,
  dec: number,
  name: string,
  now: Date,
  loc: ObservatoryLoc,
): Assessment {
  const vis = computeVisibilityRaDec(ra, dec, now, loc);
  const curve = altitudeCurve(ra, dec, now, loc);

  // Moon: illumination at local midnight, and its behaviour during darkness.
  const localNow = new Date(now.getTime() + loc.utcOffset * 3600000);
  const midnightMs = localToUtcMs(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
    24,
    loc.utcOffset,
  );
  const midJd = toJD(new Date(midnightMs));
  const illum = moonIllumination(midJd);
  const moonPos = moonEqu(midJd);
  const separationDeg = Math.round(angularSep(ra, dec, moonPos.ra, moonPos.dec));

  let moonMaxAltDark = -90;
  for (const p of curve.points) {
    if (p.sunAlt < SUN_DARK && p.moonAlt > moonMaxAltDark) moonMaxAltDark = p.moonAlt;
  }
  const upDuringDark = moonMaxAltDark > 0;
  const illumPct = Math.round(illum.fraction * 100);

  // Score: visibility base, adjusted by moon interference.
  let score = { prime: 3, good: 2, low: 1, none: 0 }[vis.rating];
  const brightMoonInterference = upDuringDark && illumPct > 55 && separationDeg < 60;
  if (brightMoonInterference) score -= 1;
  if (!upDuringDark || illumPct < 20) score += 0.5;

  const visible = vis.rating !== "none";
  let rating: Assessment["rating"];
  if (!visible) rating = "poor";
  else if (score >= 3) rating = "excellent";
  else if (score >= 2) rating = "good";
  else if (score >= 1) rating = "fair";
  else rating = "poor";

  const factors: Factor[] = [
    {
      label: "Altitude",
      detail: vis.bestTimeLocal
        ? `Peaks at ${vis.maxAltitude}° around ${vis.bestTimeLocal}`
        : `Stays below the horizon at night`,
      status: vis.maxAltitude >= 45 ? "good" : vis.maxAltitude >= ALT_MIN ? "warn" : "bad",
    },
    {
      label: "Time in darkness",
      detail: `${vis.darkHours}h above ${ALT_MIN}° during astronomical night`,
      status: vis.darkHours >= 3 ? "good" : vis.darkHours >= 1.5 ? "warn" : "bad",
    },
    {
      label: "Moon",
      detail: `${illum.phase} · ${illumPct}% lit · ${separationDeg}° away · ${
        upDuringDark ? "up during darkness" : "below horizon during darkness"
      }`,
      status: brightMoonInterference ? "bad" : !upDuringDark || illumPct < 25 ? "good" : "warn",
    },
  ];

  let headline: string;
  if (!visible) headline = `${name} doesn't rise high enough tonight from Texas.`;
  else if (rating === "excellent") headline = `${name} is excellently placed tonight.`;
  else if (rating === "good") headline = `${name} is well placed tonight.`;
  else if (brightMoonInterference)
    headline = `${name} is up, but a bright Moon nearby favours L-Extreme narrowband.`;
  else headline = `${name} is imageable tonight, with some compromises.`;

  return {
    visible,
    rating,
    headline,
    maxAltitude: vis.maxAltitude,
    darkHours: vis.darkHours,
    bestTimeLocal: vis.bestTimeLocal,
    moon: { illumPct, phase: illum.phase, separationDeg, upDuringDark },
    factors,
  };
}

/** Targets with visibility, sorted best-first for the given night. */
export function rankTargets(
  list: Target[],
  now: Date,
  loc: ObservatoryLoc,
): Array<Target & { visibility: Visibility }> {
  const rank = { prime: 3, good: 2, low: 1, none: 0 } as const;
  return list
    .map((t) => ({ ...t, visibility: computeVisibility(t, now, loc) }))
    .sort((a, b) => {
      const r = rank[b.visibility.rating] - rank[a.visibility.rating];
      if (r !== 0) return r;
      if (b.visibility.darkHours !== a.visibility.darkHours)
        return b.visibility.darkHours - a.visibility.darkHours;
      return b.visibility.maxAltitude - a.visibility.maxAltitude;
    });
}
