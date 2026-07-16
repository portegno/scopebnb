/**
 * PHD2 GuideLog → guiding summary + time series. The N.I.N.A. log does NOT carry
 * guiding data, so this reads PHD2's own guide log. Deterministic, no AI.
 *
 * PHD2 GuideLog format (per "Guiding Begins at <date> HH:MM:SS" section):
 *   "Pixel scale = 6.88 arc-sec/px, ..."
 *   CSV header "Frame,Time,mount,dx,dy,RARawDistance,DECRawDistance,...,SNR,ErrorCode"
 *   data rows where RARawDistance/DECRawDistance are the raw error in guide PIXELS
 *   and Time is seconds since the block began. Error (arcsec) = raw * pixelScale.
 *
 * Validated against a real GuideLog (see src/lib/sessions/parseNinaLog.ts).
 */
import { fieldOfView } from "@/data/equipment";

/**
 * Standard PHD2 guiding metrics for a session — the numbers a serious imager
 * expects (per-axis RMS + combined total + peak), computed the PHDLogViewer way.
 */
export type GuidingSummary = {
  raRmsArcsec: number;
  decRmsArcsec: number;
  totalRmsArcsec: number;
  peakArcsec: number;
  pixelScaleArcsec: number;
  frames: number;
};

/** One guide frame: t = wall-clock minutes (past-midnight continues, e.g. 05:00 = 1740), errors in arcsec. */
export type GuidePoint = { t: number; ra: number; dec: number };

export type Phd2Parse = {
  summary: GuidingSummary;
  /** Downsampled RA/Dec trace for the scrollable guiding graph. */
  series: GuidePoint[];
  /** Wall-clock minutes at which a dither happened. */
  dithers: number[];
};

const MIN_SNR = 10; // frames below this are an unreliable/lost star, not real guiding
const MAX_SERIES = 1800; // cap the stored trace; stride-downsample beyond this

/** "HH:MM:SS" → wall-clock minutes where an hour before noon rolls to the next day. */
function clockToMin(h: number, m: number, s: number): number {
  return (h < 12 ? h + 24 : h) * 60 + m + s / 60;
}

export function parsePhd2GuideLog(text: string): Phd2Parse | null {
  if (!text || !/PHD2|Guiding Begins|RARawDistance/i.test(text)) return null;

  const scaleM = /Pixel scale\s*=\s*([\d.]+)\s*arc-?sec\/px/i.exec(text);
  const scale = scaleM ? Number(scaleM[1]) : fieldOfView.pixelScaleArcsec;
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const raPx: number[] = [];
  const decPx: number[] = [];
  const series: GuidePoint[] = [];
  const dithers: number[] = [];
  let raIdx = -1, decIdx = -1, errIdx = -1, snrIdx = -1;
  let settling = false;
  let baseMin = 0; // wall-clock minutes of the current "Guiding Begins"
  let lastMin = 0; // most recent frame time, used to place dithers

  for (const line of text.split(/\r?\n/)) {
    const begin = /Guiding Begins at \d{4}-\d{2}-\d{2} (\d{2}):(\d{2}):(\d{2})/.exec(line);
    if (begin) { baseMin = clockToMin(+begin[1], +begin[2], +begin[3]); continue; }

    if (/Settling started/i.test(line)) { settling = true; continue; }
    if (/Settling (complete|failed)/i.test(line)) { settling = false; continue; }
    if (/INFO: DITHER by/i.test(line)) { dithers.push(+lastMin.toFixed(2)); continue; }

    if (/^Frame,Time,/i.test(line)) {
      const cols = line.split(",").map((c) => c.trim());
      raIdx = cols.indexOf("RARawDistance");
      decIdx = cols.indexOf("DECRawDistance");
      errIdx = cols.indexOf("ErrorCode");
      snrIdx = cols.indexOf("SNR");
      continue;
    }
    if (raIdx < 0 || decIdx < 0 || !/^\d+,/.test(line)) continue;
    const f = line.split(",");
    lastMin = baseMin + Number(f[1]) / 60; // Time column is seconds since block began
    if (settling) continue;
    if (errIdx >= 0 && (f[errIdx] ?? "0").trim() !== "0") continue;
    if (snrIdx >= 0 && Number(f[snrIdx]) < MIN_SNR) continue;
    const ra = Number(f[raIdx]);
    const dec = Number(f[decIdx]);
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
    raPx.push(ra);
    decPx.push(dec);
    series.push({ t: +lastMin.toFixed(2), ra: +(ra * scale).toFixed(2), dec: +(dec * scale).toFixed(2) });
  }

  if (raPx.length < 10) return null;

  // Per-axis RMS = sqrt(mean(x^2)); total = sqrt(RA^2 + Dec^2). Peak = worst
  // single-frame combined error. All in arcsec (raw distance is in guide pixels).
  const rms = (xs: number[]) => Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length) * scale;
  const raRms = rms(raPx);
  const decRms = rms(decPx);
  const peak = Math.max(...raPx.map((r, i) => Math.hypot(r, decPx[i]))) * scale;

  // Stride-downsample the stored trace so the report doc stays small.
  const stride = Math.max(1, Math.ceil(series.length / MAX_SERIES));
  const thinned = stride === 1 ? series : series.filter((_, i) => i % stride === 0);

  return {
    summary: {
      raRmsArcsec: +raRms.toFixed(2),
      decRmsArcsec: +decRms.toFixed(2),
      totalRmsArcsec: +Math.hypot(raRms, decRms).toFixed(2),
      peakArcsec: +peak.toFixed(2),
      pixelScaleArcsec: +scale.toFixed(2),
      frames: raPx.length,
    },
    series: thinned,
    dithers,
  };
}
