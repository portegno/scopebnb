/**
 * Demo session reports — real data extracted from an on-site N.I.N.A. night
 * (log + Night Summary), shaped into the SessionReport model. Demo/seed content
 * kept separate from UI, same as equipment.ts.
 *
 * Seeded from: 2026-07-11, Crescent Nebula (NGC 6888), client "Gabriel".
 */
import type { SessionReport, HfrPoint } from "@/lib/sessions/report";
import { equipment } from "@/data/equipment";
import { CRESCENT_GUIDING_POINTS, CRESCENT_GUIDING_DITHERS } from "@/data/crescentGuiding";

/** Pull the rig items that were actually in play this night, in report order. */
const pickEquipment = (...roles: string[]) =>
  roles
    .map((r) => equipment.find((e) => e.role === r))
    .filter((e): e is (typeof equipment)[number] => Boolean(e))
    .map(({ role, name, detail }) => ({ role, name, detail }));

/** HFR per saved light frame across the two windows (px), from the night log. */
const CRESCENT_HFR: HfrPoint[] = [
  { t: "23:42", hfr: 2.57 }, { t: "23:45", hfr: 2.55 }, { t: "23:48", hfr: 2.59 },
  { t: "23:52", hfr: 2.57 }, { t: "23:55", hfr: 2.58 }, { t: "23:58", hfr: 2.61 },
  { t: "00:02", hfr: 2.62 }, { t: "00:05", hfr: 2.63 }, { t: "00:09", hfr: 2.67 },
  { t: "00:12", hfr: 2.77 }, { t: "00:20", hfr: 2.94 }, { t: "00:23", hfr: 2.92 },
  { t: "00:27", hfr: 2.91 }, { t: "00:30", hfr: 2.93 }, { t: "00:33", hfr: 2.92 },
  { t: "00:37", hfr: 2.95 }, { t: "00:40", hfr: 2.92 }, { t: "00:43", hfr: 2.91 },
  { t: "00:47", hfr: 2.92 }, { t: "00:50", hfr: 2.90 }, { t: "00:54", hfr: 2.91 },
  { t: "00:57", hfr: 2.89 }, { t: "01:01", hfr: 2.89 }, { t: "01:04", hfr: 2.88 },
  { t: "01:08", hfr: 2.87 }, { t: "01:11", hfr: 2.87 }, { t: "01:14", hfr: 2.85 },
  { t: "01:18", hfr: 2.85 }, { t: "01:21", hfr: 2.85 }, { t: "01:25", hfr: 2.81 },
  { t: "01:29", hfr: 2.81 }, { t: "01:32", hfr: 2.79 }, { t: "01:36", hfr: 2.77 },
  { t: "01:39", hfr: 2.76 }, { t: "01:43", hfr: 2.76 }, { t: "01:46", hfr: 2.75 },
  { t: "01:49", hfr: 2.75 }, { t: "01:53", hfr: 2.74 }, { t: "01:56", hfr: 2.73 },
  { t: "01:59", hfr: 2.74 }, { t: "02:03", hfr: 2.74 }, { t: "02:06", hfr: 2.76 },
  { t: "02:10", hfr: 2.65 },
  { t: "03:50", hfr: 2.02 }, { t: "03:53", hfr: 1.97 }, { t: "03:57", hfr: 1.99 },
  { t: "04:00", hfr: 2.02 }, { t: "04:04", hfr: 2.07 }, { t: "04:07", hfr: 2.13 },
  { t: "04:14", hfr: 2.90 }, { t: "04:18", hfr: 2.85 }, { t: "04:21", hfr: 2.86 },
  { t: "04:25", hfr: 2.81 }, { t: "04:28", hfr: 2.81 }, { t: "04:32", hfr: 2.76 },
  { t: "04:35", hfr: 2.72 }, { t: "04:39", hfr: 2.71 }, { t: "04:42", hfr: 2.66 },
  { t: "04:45", hfr: 2.67 }, { t: "04:49", hfr: 2.67 }, { t: "04:52", hfr: 2.68 },
  { t: "04:55", hfr: 2.64 }, { t: "04:59", hfr: 2.62 }, { t: "05:02", hfr: 2.68 },
  { t: "05:05", hfr: 2.64 }, { t: "05:09", hfr: 2.64 }, { t: "05:12", hfr: 2.55 },
  { t: "05:16", hfr: 2.67 }, { t: "05:19", hfr: 2.61 }, { t: "05:23", hfr: 2.64 },
  { t: "05:26", hfr: 2.56 }, { t: "05:29", hfr: 2.54 }, { t: "05:33", hfr: 2.79 },
  { t: "05:36", hfr: 1.76 },
];

export const crescentNebula_2026_07_11: SessionReport = {
  id: "demo-crescent-2026-07-11",
  status: "delivered",
  client: { name: "Gabriel" },

  target: {
    name: "Crescent Nebula",
    catalog: "NGC 6888 · Caldwell 27",
    raDeg: 303.029,
    decDeg: 38.355,
    raText: "20h 12m 07s",
    decText: "+38° 21′ 18″",
    rotationDeg: 95,
  },

  date: "2026-07-11",
  sessionStart: "23:30",
  sessionEnd: "05:50",
  durationHours: 6.3,
  windows: [
    { start: "23:39", end: "02:10", frames: 43, integration: "2h 9m" },
    { start: "03:47", end: "05:36", frames: 31, integration: "1h 33m" },
  ],

  capture: {
    filter: "Optolong L-Extreme",
    filterDetail: "dual narrowband · Hα + OIII 7nm",
    subSeconds: 180,
    frames: 74,
    integration: "3h 42m",
    gain: 100,
    offset: 30,
    binning: "1×1",
    sensorTempC: -5,
  },

  delivery: {
    lights: 74,
    calibration: true,
    integratedImage: false,
  },

  conditions: {
    moon: { illumPct: 7, phase: "Waning crescent", separationDeg: 103, trend: "down" },
    avgHfr: 2.68,
    avgGuidingRms: 3.06,
    yieldPct: 82,
    starCountCvPct: 19,
  },

  equipment: pickEquipment(
    "Telescope (OTA)",
    "Main camera",
    "Filter wheel",
    "Mount",
    "Guiding",
    "Rotator",
    "Focuser",
  ),

  // A real 180s L-Extreme sub off the scope this night, decoded from the raw
  // FITS and auto-stretched server-side (see src/lib/sessions/fitsToJpg.ts).
  // Mono is correct for a single dual-narrowband sub; not a processed stack.
  finalImage: {
    src: "/images/sessions/crescent-2026-07-11.jpg",
    zoomSrc: "/images/sessions/crescent-2026-07-11-full.jpg",
    caption: "Crescent Nebula (NGC 6888) · single 180s L-Extreme sub, auto-stretched",
    credit: "Starfront Observatories · your light frame",
    // Narrowband defaults to mono; color is the honest debayered duochrome.
    renders: [
      { label: "Mono", src: "/images/sessions/crescent-2026-07-11.jpg", zoomSrc: "/images/sessions/crescent-2026-07-11-full.jpg" },
      { label: "Color", src: "/images/sessions/crescent-2026-07-11-color.jpg", zoomSrc: "/images/sessions/crescent-2026-07-11-color-full.jpg" },
    ],
  },

  autofocus: [
    { time: "23:41", filter: "L-Extreme", tempC: 27.6, position: 3710 },
    { time: "00:20", filter: "L-Extreme", tempC: 27.6, position: 3670 },
    { time: "03:50", filter: "L-Extreme", tempC: 27.6, position: 3694 },
    { time: "04:14", filter: "L-Extreme", tempC: 26.6, position: 3675 },
  ],

  technical: {
    profile: "Default · N.I.N.A. 3.2.0.9001",
    metrics: [{ label: "HFR", unit: "px", min: 1.76, max: 2.95, mean: 2.68, cv: 9 }],
    overhead: {
      total: "1h 1m",
      accountedPct: 95.1,
      unaccounted: "3m 9s",
      items: [
        { label: "Dither", count: 72, total: "30m 9s", seconds: 1809 },
        { label: "Image Save", count: 83, total: "21m 53s", seconds: 1313 },
        { label: "Autofocus", count: 4, total: "17m 59s", seconds: 1079 },
        { label: "Wait", count: 3, total: "5m 0s", seconds: 300 },
        { label: "Centering", count: 2, total: "4m 21s", seconds: 261 },
        { label: "Camera Download", count: 87, total: "1m 26s", seconds: 86 },
        { label: "Guiding", count: 3, total: "1m 5s", seconds: 65 },
        { label: "Mount", count: 4, total: "42s", seconds: 42 },
        { label: "Plate Solve", count: 24, total: "36s", seconds: 36 },
        { label: "Flat Panel", count: 5, total: "14s", seconds: 14 },
      ],
    },
    hfrSeries: CRESCENT_HFR,
    history: [
      { date: "2026-07-10", integration: "5.3h", avgHfr: 2.96 },
      { date: "2026-07-07", integration: "5.0h", avgHfr: 3.92 },
      { date: "2026-07-02", integration: "1.6h", avgHfr: 1.57 },
    ],
    // Real PHD2 guide-log numbers (guide scale 6.88"/px), computed the standard way.
    guiding: { raRmsArcsec: 2.1, decRmsArcsec: 2.24, totalRmsArcsec: 3.06, peakArcsec: 9.57, frames: 3043 },
    guidingTrace: { points: CRESCENT_GUIDING_POINTS, dithers: CRESCENT_GUIDING_DITHERS },
  },

  // AI-generated (Gemini, in Mike's voice) from the facts + assessment flags —
  // see src/lib/sessions/narrate.ts. Seeded here so the demo renders it without
  // an API call; in production it is generated once at delivery and stored.
  narrative: {
    howItWent: [
      {
        title: "Focus and Seeing",
        body: "Your focus was remarkably stable, with HFR averaging 2.68px and only 9% variation. This indicates excellent seeing conditions throughout the night.",
      },
      {
        title: "Tracking Performance",
        body: "Guiding held a mean RMS of 3.06 arcseconds over your 180 second exposures. This is a fair result for the conditions.",
      },
      {
        title: "Data Captured",
        body: "We captured 74 light frames totaling 3 hours and 42 minutes using the Optolong L-Extreme filter. The sky transparency was good, with star counts varying only 19%.",
      },
    ],
    mikeRecap:
      "It was a productive night imaging the Crescent Nebula from our Bortle 1 site. Conditions were quite good, with excellent focus stability and clear skies, although guiding was a bit challenging. We managed to collect a solid 3 hours and 42 minutes of L-Extreme data across two imaging windows. You're taking home 74 calibrated light frames, ready for your own integration.",
  },
};

/** All demo reports, keyed by id — the report route looks up here for now. */
export const demoSessionReports: Record<string, SessionReport> = {
  [crescentNebula_2026_07_11.id]: crescentNebula_2026_07_11,
};

export function getSessionReport(id: string): SessionReport | null {
  return demoSessionReports[id] ?? null;
}
