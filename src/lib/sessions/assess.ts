/**
 * Deterministic session assessment: metrics → qualitative flags via fixed
 * thresholds. This is where JUDGEMENTS live ("focus was steady", "yield was
 * high") — as rules, not AI opinion. The AI narrator receives these flags plus
 * the raw numbers and only phrases them; it never decides good vs. bad itself.
 *
 * Mirrors the existing assessConditions() pattern in lib/visibility.ts.
 */
import type { SessionReport } from "./report";

export type FlagTier = "great" | "good" | "fair" | "poor";

export type SessionFlag = {
  key: "focus" | "guiding" | "yield" | "integration" | "moon" | "consistency";
  label: string;
  tier: FlagTier;
  /** One deterministic sentence of fact the narrator can lean on. */
  summary: string;
};

const hfrCv = (r: SessionReport) => r.technical.metrics.find((m) => m.label === "HFR")?.cv ?? null;

export function assessSession(r: SessionReport): SessionFlag[] {
  const flags: SessionFlag[] = [];

  // Focus stability — HFR coefficient of variation across the night.
  const cv = hfrCv(r);
  if (cv != null) {
    const tier: FlagTier = cv < 10 ? "great" : cv < 18 ? "good" : cv < 30 ? "fair" : "poor";
    flags.push({
      key: "focus",
      label: "Focus stability",
      tier,
      summary: `HFR averaged ${r.conditions.avgHfr.toFixed(2)}px with only ${cv}% variation across the night.`,
    });
  }

  // Guiding — mean total RMS in arcseconds (only when a PHD2 log was supplied).
  const g = r.conditions.avgGuidingRms;
  if (g != null) {
    const tier: FlagTier = g < 1.2 ? "great" : g < 2.0 ? "good" : g < 3.0 ? "fair" : "poor";
    flags.push({
      key: "guiding",
      label: "Guiding",
      tier,
      summary: `Guiding held a mean RMS of ${g.toFixed(2)}" over ${r.capture.subSeconds}s subs.`,
    });
  }

  // Yield — share of open-sky time actually spent exposing.
  {
    const y = r.conditions.yieldPct;
    const tier: FlagTier = y >= 85 ? "great" : y >= 70 ? "good" : y >= 55 ? "fair" : "poor";
    flags.push({
      key: "yield",
      label: "Yield",
      tier,
      summary: `${y}% of the open-sky time went into exposures; the rest was dither, autofocus and saves.`,
    });
  }

  // Integration — total signal collected.
  {
    const mins = r.windows.reduce((s, w) => s + windowMinutes(w.start, w.end), 0);
    const tier: FlagTier = mins >= 180 ? "great" : mins >= 90 ? "good" : mins >= 45 ? "fair" : "poor";
    flags.push({
      key: "integration",
      label: "Integration",
      tier,
      summary: `${r.capture.frames} × ${r.capture.subSeconds}s = ${r.capture.integration} of ${r.capture.filter} signal across ${r.windows.length} window${r.windows.length === 1 ? "" : "s"}.`,
    });
  }

  // Moon — how much it interfered.
  {
    const m = r.conditions.moon.illumPct;
    const tier: FlagTier = m < 15 ? "great" : m < 40 ? "good" : m < 65 ? "fair" : "poor";
    flags.push({
      key: "moon",
      label: "Moon",
      tier,
      summary: `A ${m}% ${r.conditions.moon.phase.toLowerCase()} Moon sat ${r.conditions.moon.separationDeg}° from the target.`,
    });
  }

  // Sky consistency — broadband star-count variation, if present.
  if (r.conditions.starCountCvPct != null) {
    const c = r.conditions.starCountCvPct;
    const tier: FlagTier = c < 12 ? "great" : c < 22 ? "good" : c < 35 ? "fair" : "poor";
    flags.push({
      key: "consistency",
      label: "Transparency",
      tier,
      summary: `Star counts varied ${c}% frame to frame — a proxy for how steady and clear the sky stayed.`,
    });
  }

  return flags;
}

/** Minutes between two "HH:MM" times, wrapping past midnight. */
function windowMinutes(start: string, end: string): number {
  const to = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h < 12 ? h + 24 : h) * 60 + m;
  };
  return Math.max(0, to(end) - to(start));
}
