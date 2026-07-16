/**
 * Deterministic extractor: raw N.I.N.A. .log (+ optional PHD2 guide log) →
 * SessionReport metrics. NO third-party plugin, NO AI — we compute every number
 * ourselves from native N.I.N.A. log lines, so the pipeline owns its data end to
 * end. Sky facts the log can't hold (moon) are computed astronomically; guiding
 * comes from PHD2's own guide log when supplied, otherwise it's null.
 *
 * The narrative layer (Mike) runs on top of these facts and never invents them.
 */
import type {
  SessionReport,
  SessionWindow,
  AutofocusRun,
  MetricStat,
  OverheadItem,
  HfrPoint,
} from "./report";
import { moonState } from "@/lib/visibility";
import { equipment as rigEquipment } from "@/data/equipment";
import { parsePhd2GuideLog } from "./parsePhd2";

const FILTER_LABELS: Record<string, { filter: string; detail?: string }> = {
  "L-EXTREME": { filter: "Optolong L-Extreme", detail: "dual narrowband · Hα + OIII 7nm" },
  CLEAR: { filter: "No filter", detail: "broadband true colour" },
};

type LogLine = { t: Date; hm: string; body: string };

/** Parse "2026-07-11T23:42:00.0624|INFO|Src|Fn|Line|message" lines. */
function parseLines(text: string): LogLine[] {
  const out: LogLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|(.*)$/.exec(raw);
    if (!m) continue;
    const t = new Date(m[1]);
    if (isNaN(t.getTime())) continue;
    out.push({ t, hm: m[1].slice(11, 16), body: m[2] });
  }
  return out;
}

const raToDeg = (t: string) => {
  const m = /(\d+):(\d+):([\d.]+)/.exec(t);
  return m ? (Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600) * 15 : NaN;
};
const decToDeg = (t: string) => {
  const m = /([+-]?\d+)[°:\s]+(\d+)[′'\s]+([\d.]+)/.exec(t);
  if (!m) return NaN;
  const sign = t.trim().startsWith("-") ? -1 : 1;
  return sign * (Math.abs(Number(m[1])) + Number(m[2]) / 60 + Number(m[3]) / 3600);
};

/** Seconds → "Xh Ym" / "Ym Zs" / "Zs". */
function fmtDur(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${r}s`;
  return `${r}s`;
}

const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const stdev = (xs: number[], mean: number) =>
  xs.length < 2 ? 0 : Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1));
const mode = <T>(xs: T[]): T => {
  const c = new Map<T, number>();
  xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

export type ParseNinaOptions = {
  id: string;
  client: { name: string; email?: string };
  status?: "captured" | "delivered";
  /** PHD2 GuideLog text for guiding RMS (optional; guiding is null without it). */
  phd2Log?: string;
  catalog?: string;
};

export function parseNinaLog(logText: string, opts: ParseNinaOptions): SessionReport {
  const lines = parseLines(logText);

  // --- Target (native "... Target: <name> RA: HH:MM:SS; Dec: ...; Epoch: J2000 <rot>") ---
  let targetName = "Target", raText = "", decText = "", rotationDeg = 0;
  for (const l of lines) {
    const m = /Target:\s*(.+?)\s+RA:\s*([\d:]+);\s*Dec:\s*([^;]+);\s*Epoch:\s*J2000\s*(\d+)/.exec(l.body);
    if (m) {
      targetName = m[1].trim();
      raText = m[2].trim();
      decText = m[3].trim();
      rotationDeg = Number(m[4]);
      break;
    }
  }
  const raDeg = raToDeg(raText);
  const decDeg = decToDeg(decText);

  // --- Light frames (native LIGHT saves; filename encodes the capture start) ---
  type Light = { start: Date; save: Date; filter: string; tempC: number; exp: number };
  const lights: Light[] = [];
  const saveRe =
    /Saved image to .*[\\/]LIGHT[\\/](\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})_([^_]+)_(-?[\d.]+)_([\d.]+)s_\d+\.fits/;
  for (const l of lines) {
    const m = saveRe.exec(l.body);
    if (!m) continue;
    const start = new Date(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]),
    );
    lights.push({ start, save: l.t, filter: m[7], tempC: Number(m[8]), exp: Number(m[9]) });
  }
  lights.sort((a, b) => a.start.getTime() - b.start.getTime());

  // --- HFR + star count per light: the StarDetection just before each save ---
  // Body is just the message (source field already stripped); this "Average HFR
  // ..., Detected Stars N" shape is unique to StarDetection.
  const detRe = /Average HFR:\s*([\d.]+),\s*HFR σ:\s*[\d.]+,\s*Detected Stars\s*(\d+)/;
  const detections = lines
    .map((l) => {
      const m = detRe.exec(l.body);
      return m ? { t: l.t, hfr: Number(m[1]), stars: Number(m[2]) } : null;
    })
    .filter((d): d is { t: Date; hfr: number; stars: number } => d !== null);

  const hfrSeries: HfrPoint[] = [];
  const starCounts: number[] = [];
  for (const lt of lights) {
    // last detection strictly before the save (that's this light's own detection)
    let best: { t: Date; hfr: number; stars: number } | null = null;
    for (const d of detections) {
      if (d.t <= lt.save && (!best || d.t > best.t)) best = d;
    }
    if (best) {
      hfrSeries.push({ t: hm(lt.start), hfr: +best.hfr.toFixed(2) });
      starCounts.push(best.stars);
    }
  }

  const frames = lights.length;
  const subSeconds = lights.length ? Math.round(mode(lights.map((l) => l.exp))) : 0;
  const rawFilter = (lights.length ? mode(lights.map((l) => l.filter)) : "").toUpperCase();
  const filterInfo = FILTER_LABELS[rawFilter] ?? { filter: rawFilter || "Unknown" };
  const sensorTempC = lights.length ? Math.round(mode(lights.map((l) => Math.round(l.tempC)))) : 0;

  // gain / offset from a native LIGHT TakeExposure line
  let gain = 0, offset = 0;
  for (const l of lines) {
    const m = /TakeExposure, ExposureTime \d+, Gain (\d+), Offset (\d+), ImageType LIGHT/.exec(l.body);
    if (m) { gain = Number(m[1]); offset = Number(m[2]); break; }
  }

  // --- Windows: contiguous light runs (gap between starts > 30 min) ---
  const windows: SessionWindow[] = [];
  if (lights.length) {
    let group: Light[] = [lights[0]];
    const flush = () => {
      const first = group[0], last = group[group.length - 1];
      const secs = group.length * subSeconds;
      windows.push({ start: hm(first.start), end: hm(new Date(last.start.getTime() + subSeconds * 1000)), frames: group.length, integration: fmtDur(secs) });
    };
    for (let i = 1; i < lights.length; i++) {
      if (lights[i].start.getTime() - lights[i - 1].start.getTime() > 30 * 60 * 1000) { flush(); group = []; }
      group.push(lights[i]);
    }
    flush();
  }

  // --- Autofocus (native): temperature broadcast + preceding focuser position ---
  const firstLight = lights[0]?.start.getTime() ?? 0;
  const autofocus: AutofocusRun[] = [];
  let lastFocuserPos = 0;
  let activeFilter = rawFilter;
  for (const l of lines) {
    const fp = /Moving Focuser to position (\d+)/.exec(l.body);
    if (fp) lastFocuserPos = Number(fp[1]);
    const fc = /Moving to Filter (\S+)|SwitchFilter, Filter:\s*(\S+)/.exec(l.body);
    if (fc) activeFilter = (fc[1] ?? fc[2]).toUpperCase();
    const af = /Autofocus notification received - Temperature ([\d.]+)/.exec(l.body);
    if (af && l.t.getTime() >= firstLight - 5 * 60 * 1000) {
      autofocus.push({
        time: hm(l.t),
        filter: FILTER_LABELS[activeFilter]?.filter?.replace("Optolong ", "") ?? activeFilter,
        tempC: +Number(af[1]).toFixed(1),
        position: lastFocuserPos,
      });
    }
  }

  // --- Overhead: total = window span − exposure; break out Dither + Autofocus ---
  const pairDur = (startRe: RegExp, endRe: RegExp) => {
    let total = 0, count = 0, open: Date | null = null;
    for (const l of lines) {
      if (startRe.test(l.body)) open = l.t;
      else if (endRe.test(l.body) && open) { total += (l.t.getTime() - open.getTime()) / 1000; count++; open = null; }
    }
    return { total, count };
  };
  const dither = pairDur(/Starting Category: Guider, Item: Dither/, /Finishing Category: Guider, Item: Dither/);
  const afOv = pairDur(/Starting Category: Focuser, Item: RunAutofocus/, /Finishing Category: Focuser, Item: RunAutofocus/);
  const exposureSec = frames * subSeconds;
  // Real overhead = time between consecutive light starts (within a window)
  // beyond the exposure itself. This captures dither + save + autofocus + misc.
  let overheadSec = 0;
  for (let i = 1; i < lights.length; i++) {
    const gap = (lights[i].start.getTime() - lights[i - 1].start.getTime()) / 1000;
    if (gap > 0 && gap < 30 * 60) overheadSec += Math.max(0, gap - subSeconds); // same-window pairs only
  }
  const measuredSec = dither.total + afOv.total;
  // Total non-exposing time: the inter-frame overhead, but never less than the
  // dither + autofocus we measured directly (autofocus can fall between windows).
  const overheadTotalSec = Math.max(overheadSec, measuredSec);
  const otherSec = Math.max(0, overheadTotalSec - measuredSec);
  const items: OverheadItem[] = [
    { label: "Dither", count: dither.count, total: fmtDur(dither.total), seconds: Math.round(dither.total) },
    { label: "Autofocus", count: afOv.count, total: fmtDur(afOv.total), seconds: Math.round(afOv.total) },
    { label: "Saves & misc", count: 0, total: fmtDur(otherSec), seconds: Math.round(otherSec) },
  ].filter((i) => i.seconds > 0);
  const accountedPct = overheadTotalSec ? +((measuredSec / overheadTotalSec) * 100).toFixed(1) : 0;

  // --- Aggregates ---
  const hfrs = hfrSeries.map((p) => p.hfr);
  const hfrMean = hfrs.length ? hfrs.reduce((s, x) => s + x, 0) / hfrs.length : 0;
  const hfrCv = hfrMean ? Math.round((stdev(hfrs, hfrMean) / hfrMean) * 100) : 0;
  const starMean = starCounts.length ? starCounts.reduce((s, x) => s + x, 0) / starCounts.length : 0;
  const starCv = starMean ? Math.round((stdev(starCounts, starMean) / starMean) * 100) : undefined;

  // --- Guiding from PHD2 (optional) ---
  const guiding = opts.phd2Log ? parsePhd2GuideLog(opts.phd2Log) : null;

  // --- Session span + moon (computed) ---
  const startDate = lights[0]?.start ?? lines[0]?.t ?? new Date();
  const endDate = lights.length ? new Date(lights[lights.length - 1].start.getTime() + subSeconds * 1000) : lines[lines.length - 1]?.t ?? startDate;
  const durationHours = +(((endDate.getTime() - startDate.getTime()) / 3600000)).toFixed(1);
  const dateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
  const midSession = new Date((startDate.getTime() + endDate.getTime()) / 2);
  const moon = Number.isFinite(raDeg) ? moonState(raDeg, decDeg, midSession) : { illumPct: 0, phase: "Unknown", separationDeg: 0, trend: "down" as const };

  const metrics: MetricStat[] = [];
  if (hfrs.length) {
    metrics.push({ label: "HFR", unit: "px", min: +Math.min(...hfrs).toFixed(2), max: +Math.max(...hfrs).toFixed(2), mean: +hfrMean.toFixed(2), cv: hfrCv });
  }

  return {
    id: opts.id,
    status: opts.status ?? "delivered",
    client: opts.client,
    target: { name: targetName, catalog: opts.catalog, raDeg, decDeg, raText: fmtRa(raText), decText: fmtDec(decText), rotationDeg },
    date: dateStr,
    sessionStart: hm(startDate),
    sessionEnd: hm(endDate),
    durationHours,
    windows,
    capture: {
      filter: filterInfo.filter,
      filterDetail: filterInfo.detail,
      subSeconds,
      frames,
      integration: fmtDur(exposureSec),
      gain,
      offset,
      binning: "1×1",
      sensorTempC,
    },
    delivery: { lights: frames, calibration: true, integratedImage: false },
    conditions: {
      moon,
      avgHfr: +hfrMean.toFixed(2),
      avgGuidingRms: guiding ? guiding.summary.totalRmsArcsec : null,
      yieldPct: exposureSec + overheadSec ? Math.round((exposureSec / (exposureSec + overheadSec)) * 100) : 0,
      starCountCvPct: starCv,
    },
    equipment: rigEquipment
      .filter((e) => ["Telescope (OTA)", "Main camera", "Filter wheel", "Mount", "Guiding", "Rotator", "Focuser"].includes(e.role))
      .map(({ role, name, detail }) => ({ role, name, detail })),
    finalImage: Number.isFinite(raDeg)
      ? {
          src: `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?hips=CDS/P/DSS2/color&width=1040&height=694&fov=1.9&projection=TAN&coordsys=icrs&ra=${raDeg}&dec=${decDeg}&format=jpg`,
          caption: `${targetName} · field preview at capture framing`,
          credit: "DSS2 color survey · CDS/Strasbourg",
        }
      : undefined,
    autofocus,
    technical: {
      profile: "Parsed from N.I.N.A. log",
      metrics,
      overhead: { total: fmtDur(overheadTotalSec), accountedPct, unaccounted: fmtDur(otherSec), items },
      hfrSeries,
      history: [],
      guiding: guiding
        ? {
            raRmsArcsec: guiding.summary.raRmsArcsec,
            decRmsArcsec: guiding.summary.decRmsArcsec,
            totalRmsArcsec: guiding.summary.totalRmsArcsec,
            peakArcsec: guiding.summary.peakArcsec,
            frames: guiding.summary.frames,
          }
        : null,
      guidingTrace: guiding ? { points: guiding.series, dithers: guiding.dithers } : null,
    },
    narrative: null,
  };
}

/**
 * Pick the best light of the night for the preview image: the sharpest sub
 * (lowest HFR) among frames with a healthy star count (a floor guards against a
 * fluke low-HFR frame taken through cloud). Returns the light's absolute save
 * path exactly as N.I.N.A. recorded it in the log (confirmed to exist on disk),
 * so the on-site uploader can read that file directly. Null if no LIGHT saved.
 */
export function bestLightPath(logText: string): string | null {
  const lines = parseLines(logText);
  // "Saved image to <path>" is the clean save line (BaseImageData.SaveToDisk).
  const saveRe = /Saved image to (.+?[\\/]LIGHT[\\/].+?\.fits)/;
  const detRe = /Average HFR:\s*([\d.]+),\s*HFR σ:\s*[\d.]+,\s*Detected Stars\s*(\d+)/;

  const detections = lines
    .map((l) => {
      const m = detRe.exec(l.body);
      return m ? { t: l.t, hfr: Number(m[1]), stars: Number(m[2]) } : null;
    })
    .filter((d): d is { t: Date; hfr: number; stars: number } => d !== null);

  const frames: { path: string; hfr: number; stars: number }[] = [];
  for (const l of lines) {
    const m = saveRe.exec(l.body);
    if (!m) continue;
    // Star detection for this frame is the last one at/before its save line.
    let best: { t: Date; hfr: number; stars: number } | null = null;
    for (const d of detections) if (d.t <= l.t && (!best || d.t > best.t)) best = d;
    if (best) frames.push({ path: m[1], hfr: best.hfr, stars: best.stars });
  }
  if (!frames.length) return null;

  const medStars = [...frames.map((f) => f.stars)].sort((a, b) => a - b)[frames.length >> 1] ?? 0;
  const floor = medStars * 0.6;
  const pool = frames.filter((f) => f.stars >= floor);
  const cands = pool.length ? pool : frames;
  cands.sort((a, b) => a.hfr - b.hfr || b.stars - a.stars);
  return cands[0].path;
}

/** "20:12:07" → "20h 12m 07s". */
function fmtRa(t: string): string {
  const m = /(\d+):(\d+):(\d+)/.exec(t);
  return m ? `${m[1]}h ${m[2]}m ${m[3].padStart(2, "0")}s` : t;
}
/** "38° 21' 18\"" → "+38° 21′ 18″". */
function fmtDec(t: string): string {
  const m = /([+-]?\d+)[°:\s]+(\d+)[′'\s]+([\d.]+)/.exec(t);
  if (!m) return t;
  const sign = t.trim().startsWith("-") ? "-" : "+";
  return `${sign}${Math.abs(Number(m[1]))}° ${m[2]}′ ${Math.round(Number(m[3]))}″`;
}
