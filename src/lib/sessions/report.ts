/**
 * Session report — the data model behind a client-facing "what happened on
 * your night" report. Pure types only, no UI and no Firebase. A report is
 * derived from the on-site N.I.N.A. night log + summary; this shape is what the
 * report component renders, so the extraction step (or demo seed) fills it in.
 *
 * Demo/seed instances live in src/data/sessions.ts, kept separate from the UI.
 */

/** One labelled equipment row, mirroring src/data/equipment.ts → Spec. */
export type ReportEquipment = {
  role: string;
  name: string;
  detail?: string;
};

/** A contiguous stretch of the night when the target was actually imaged. */
export type SessionWindow = {
  start: string; // "HH:MM" local
  end: string; // "HH:MM" local
  frames: number;
  integration: string; // pretty duration, e.g. "2h 9m"
};

/** A single autofocus run recorded during the night. */
export type AutofocusRun = {
  time: string; // "HH:MM"
  filter: string;
  tempC: number;
  position: number;
};

/** Session guiding breakdown from the PHD2 guide log (arcsec). Null if no log. */
export type GuidingStats = {
  raRmsArcsec: number;
  decRmsArcsec: number;
  totalRmsArcsec: number;
  peakArcsec: number;
  frames: number;
};

/** One point on the scrollable guiding graph: t = wall-clock minutes, errors in arcsec. */
export type GuideTracePoint = { t: number; ra: number; dec: number };

/** The RA/Dec guiding trace + dither times for the scrollable timeline graph. */
export type GuidingTrace = {
  points: GuideTracePoint[];
  dithers: number[]; // wall-clock minutes
};

/** One min/max/mean/CV metric row (HFR, guiding RMS, …). */
export type MetricStat = {
  label: string;
  unit: string;
  min: number;
  max: number;
  mean: number;
  cv: number; // coefficient of variation, %
};

/** One category in the imaging-overhead breakdown. */
export type OverheadItem = {
  label: string;
  count: number;
  total: string; // pretty duration
  seconds: number; // for the proportional bar
};

/** A point on the HFR-vs-time curve (one saved light frame). */
export type HfrPoint = {
  t: string; // "HH:MM"
  hfr: number; // px
};

/** A prior session on the same target, for the "history" strip. */
export type PriorSession = {
  date: string; // "YYYY-MM-DD"
  integration: string;
  avgHfr: number;
  avgGuidingRms?: number;
};

/**
 * The AI-generated narrative layer. The parser NEVER fills this — it's written
 * by the AI narrator from the extracted facts (numbers + assessment flags), in
 * plain language and in Mike's voice. Null until generated.
 */
export type SessionNarrative = {
  /** Plain-language "how it went" cards (title + body), grounded in the metrics. */
  howItWent: { title: string; body: string }[];
  /** Mike's first-person recap of the client's night. */
  mikeRecap: string;
};

/**
 * The full report. `technical` holds the deep-dive fields shown in the
 * collapsible section; everything above it is the client-friendly summary.
 */
export type SessionReport = {
  id: string;
  status: "captured" | "delivered";
  client: { name: string; email?: string };

  // Target + framing
  target: {
    name: string;
    catalog?: string; // "NGC 6888 · Caldwell 27"
    raDeg: number;
    decDeg: number;
    raText: string; // "20h 12m 07s"
    decText: string; // "+38° 21′ 18″"
    rotationDeg: number;
  };

  // Night
  date: string; // "YYYY-MM-DD"
  sessionStart: string; // "HH:MM"
  sessionEnd: string; // "HH:MM"
  durationHours: number;
  windows: SessionWindow[];

  // What we collected
  capture: {
    filter: string; // "Optolong L-Extreme"
    filterDetail?: string; // "dual narrowband · Hα + OIII 7nm"
    subSeconds: number;
    frames: number;
    integration: string; // "3h 42m"
    gain: number;
    offset: number;
    binning: string; // "1×1"
    sensorTempC: number;
  };

  // Managed delivery: lights + calibration always; integrated image is an add-on.
  delivery: {
    lights: number;
    calibration: boolean;
    integratedImage: boolean;
  };

  // Sky + result quality (the headline numbers)
  conditions: {
    moon: { illumPct: number; phase: string; separationDeg: number; trend: "up" | "down" };
    avgHfr: number; // px
    avgGuidingRms: number | null; // arcsec — null when no PHD2 guide log was supplied
    yieldPct: number; // % of open-roof time spent exposing
    starCountCvPct?: number; // broadband consistency
  };

  equipment: ReportEquipment[];

  // Optional hero: the integrated result (add-on) or a representative preview.
  // `zoomSrc` is a higher-resolution version opened in the click-to-zoom viewer.
  // `renders` (>= 2) drives a Mono/Color toggle; its first entry is the default
  // and matches `src`/`zoomSrc`.
  finalImage?: {
    src: string;
    zoomSrc?: string;
    caption?: string;
    credit?: string;
    renders?: { label: string; src: string; zoomSrc?: string }[];
  };

  autofocus: AutofocusRun[];

  // Collapsible deep-dive
  technical: {
    profile?: string;
    metrics: MetricStat[];
    overhead: {
      total: string;
      accountedPct: number;
      unaccounted: string;
      items: OverheadItem[];
    };
    hfrSeries: HfrPoint[];
    history: PriorSession[];
    /** Guiding RMS breakdown (RA/Dec/total/peak) from PHD2; null without a log. */
    guiding: GuidingStats | null;
    /** RA/Dec guiding trace + dithers for the scrollable graph; null without a log. */
    guidingTrace: GuidingTrace | null;
  };

  // AI-generated prose (see SessionNarrative). Null until the narrator runs.
  narrative: SessionNarrative | null;
};
