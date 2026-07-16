/**
 * Pure SVG charts for the session report — no dependencies, no client JS.
 * Adapted from the on-site Night Summary visual language into ScopeBnB tokens.
 */
import type { HfrPoint, SessionWindow, AutofocusRun, OverheadItem, GuideTracePoint } from "@/lib/sessions/report";

const ACCENT = "#6ea8fe";
const VIOLET = "#b07cff";
const GRID = "rgba(255,255,255,0.10)";
const MUTED = "#9aa3bd";

/** Minutes from a session baseline (default 23:30), wrapping past midnight. */
function toMin(t: string, baseHour = 23, baseMin = 30): number {
  const [h, m] = t.split(":").map(Number);
  const abs = (h < 12 ? h + 24 : h) * 60 + m;
  const base = (baseHour < 12 ? baseHour + 24 : baseHour) * 60 + baseMin;
  return abs - base;
}

/**
 * The night as a single strip: imaging windows in accent, idle time hatched,
 * autofocus runs as violet triangles. Matches the report's "at a glance" read.
 */
export function SessionTimeline({
  start,
  end,
  windows,
  autofocus,
}: {
  start: string;
  end: string;
  windows: SessionWindow[];
  autofocus: AutofocusRun[];
}) {
  const W = 760;
  const total = toMin(end, Number(start.split(":")[0]), Number(start.split(":")[1]));
  const L = 8;
  const R = 8;
  const inner = W - L - R;
  const x = (min: number) => L + (min / total) * inner;
  const baseH = Number(start.split(":")[0]);
  const baseM = Number(start.split(":")[1]);

  // Track geometry — room above the bar for the autofocus markers.
  const TOP = 20;
  const BAR = 24;
  const BOT = TOP + BAR; // axis line

  // Hour tick labels on the hour, across the night.
  const ticks: { min: number; label: string }[] = [];
  for (let m = 0; m <= total; m += 1) {
    const abs = (baseH < 12 ? baseH + 24 : baseH) * 60 + baseM + m;
    if (abs % 60 === 0) ticks.push({ min: m, label: String(((abs / 60) % 24 + 24) % 24).padStart(2, "0") + ":00" });
  }

  const AF_LIGHT = "#c4b5fd"; // lighter violet so markers read on the blue bar

  return (
    <svg viewBox={`0 0 ${W} 78`} className="w-full" style={{ fontFamily: "inherit", fontSize: 11 }}>
      <defs>
        <pattern id="sr-idle" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="rgba(255,255,255,0.02)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(176,124,255,0.28)" strokeWidth="3" />
        </pattern>
      </defs>
      {/* track */}
      <rect x={L} y={TOP} width={inner} height={BAR} rx="4" fill="rgba(255,255,255,0.03)" />
      <rect x={L} y={TOP} width={inner} height={BAR} fill="url(#sr-idle)" />
      {/* imaging windows */}
      {windows.map((w, i) => {
        const a = x(toMin(w.start, baseH, baseM));
        const b = x(toMin(w.end, baseH, baseM));
        return <rect key={i} x={a} y={TOP} width={Math.max(0, b - a)} height={BAR} rx="3" fill={ACCENT} opacity="0.85" />;
      })}
      {/* autofocus markers: stem through the bar + a chevron above it */}
      {autofocus.map((af, i) => {
        const cx = x(toMin(af.time, baseH, baseM));
        return (
          <g key={i}>
            <title>{`${af.time} — Autofocus · ${af.filter} · ${af.tempC}°C · pos ${af.position}`}</title>
            <line x1={cx} y1={TOP} x2={cx} y2={BOT} stroke={AF_LIGHT} strokeWidth="1.5" opacity="0.9" />
            <polygon points={`${cx - 5},4 ${cx + 5},4 ${cx},14`} fill={AF_LIGHT} />
          </g>
        );
      })}
      {/* axis */}
      <line x1={L} y1={BOT} x2={W - R} y2={BOT} stroke={GRID} strokeWidth="1" />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={x(t.min)} y1={BOT} x2={x(t.min)} y2={BOT + 5} stroke={GRID} />
          <text x={x(t.min)} y={BOT + 18} fill={MUTED} textAnchor="middle">{t.label}</text>
        </g>
      ))}
    </svg>
  );
}

/**
 * HFR (focus sharpness) across the night, one dot per saved light frame.
 * Lower is sharper; the line breaks across the gap between windows.
 */
export function HfrChart({ series, autofocus }: { series: HfrPoint[]; autofocus: AutofocusRun[] }) {
  if (series.length === 0) return null;
  const W = 760;
  const H = 260;
  const M = { top: 18, right: 16, bottom: 34, left: 40 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;

  const base = series[0].t;
  const baseH = Number(base.split(":")[0]);
  const baseM = Number(base.split(":")[1]);
  const mins = series.map((p) => toMin(p.t, baseH, baseM));
  const span = Math.max(1, mins[mins.length - 1]);
  const hfrs = series.map((p) => p.hfr);
  const lo = Math.floor((Math.min(...hfrs) - 0.1) * 10) / 10;
  const hi = Math.ceil((Math.max(...hfrs) + 0.1) * 10) / 10;

  const x = (min: number) => M.left + (min / span) * pw;
  const y = (hfr: number) => M.top + (1 - (hfr - lo) / (hi - lo)) * ph;

  // Split into segments where the time gap exceeds 30 min (window boundary).
  const segments: HfrPoint[][] = [];
  let cur: HfrPoint[] = [];
  series.forEach((p, i) => {
    if (i > 0 && mins[i] - mins[i - 1] > 30) {
      segments.push(cur);
      cur = [];
    }
    cur.push(p);
  });
  if (cur.length) segments.push(cur);

  const gridY = 5;
  const yLabels = Array.from({ length: gridY + 1 }, (_, i) => lo + ((hi - lo) * i) / gridY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: "inherit", fontSize: 11 }}>
      <rect x={M.left} y={M.top} width={pw} height={ph} fill="rgba(255,255,255,0.02)" rx="4" />
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} stroke={GRID} />
          <text x={M.left - 6} y={y(v) + 3} textAnchor="end" fill={MUTED}>{v.toFixed(1)}</text>
        </g>
      ))}
      {/* autofocus verticals */}
      {autofocus.map((af, i) => {
        const cx = x(toMin(af.time, baseH, baseM));
        if (cx < M.left || cx > W - M.right) return null;
        return (
          <g key={i}>
            <line x1={cx} y1={M.top} x2={cx} y2={M.top + ph} stroke={VIOLET} strokeWidth="1" strokeDasharray="4,3" opacity="0.7" />
            <text x={cx} y={M.top - 5} fill={VIOLET} fontSize="8" textAnchor="middle" opacity="0.9">AF</text>
          </g>
        );
      })}
      {/* series */}
      {segments.map((seg, si) => (
        <polyline
          key={si}
          points={seg.map((p) => `${x(toMin(p.t, baseH, baseM)).toFixed(1)},${y(p.hfr).toFixed(1)}`).join(" ")}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      {series.map((p, i) => (
        <circle key={i} cx={x(mins[i])} cy={y(p.hfr)} r="2.6" fill="#a8d4ff">
          <title>{`${p.t} — ${p.hfr.toFixed(2)} px`}</title>
        </circle>
      ))}
      {/* x labels: first, last, and each window's edges via ticks every ~60 min */}
      <text x={M.left} y={H - 12} fill={MUTED}>{series[0].t}</text>
      <text x={W - M.right} y={H - 12} textAnchor="end" fill={MUTED}>{series[series.length - 1].t}</text>
      <text x={14} y={M.top + ph / 2} fill={MUTED} textAnchor="middle" transform={`rotate(-90,14,${M.top + ph / 2})`}>HFR (px)</text>
    </svg>
  );
}

const OVERHEAD_COLORS = [
  "#6ea8fe", "#b07cff", "#f5b34a", "#34d399", "#f97316",
  "#38bdf8", "#c084fc", "#facc15", "#4ade80", "#fb7185",
];

/** Stacked proportional bar of where the non-imaging time went. */
export function OverheadBar({ items }: { items: OverheadItem[] }) {
  const total = items.reduce((s, it) => s + it.seconds, 0) || 1;
  return (
    <div className="flex h-6 w-full overflow-hidden rounded-[4px]">
      {items.map((it, i) => {
        const pct = (it.seconds / total) * 100;
        if (pct < 0.5) return null;
        return (
          <div
            key={it.label}
            title={`${it.label}: ${it.total} (${pct.toFixed(1)}%)`}
            style={{ width: `${pct}%`, background: OVERHEAD_COLORS[i % OVERHEAD_COLORS.length] }}
            className="flex items-center justify-center overflow-hidden whitespace-nowrap text-[10px] font-medium text-black/80"
          >
            {pct > 12 ? it.label : ""}
          </div>
        );
      })}
    </div>
  );
}

export { OVERHEAD_COLORS };

/** "HH:MM" → wall-clock minutes where an hour before noon rolls to the next day. */
const hmToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
};

/**
 * Scrollable PHD2-style guiding graph across the whole night: RA (blue) and Dec
 * (red) error traces, dither markers, per-frame photo ticks, and a wall-clock
 * axis. The trace breaks across gaps (e.g. between imaging windows).
 */
export function GuidingGraph({
  points,
  dithers,
  photos,
  windows,
  sessionStart,
  sessionEnd,
  rms,
}: {
  points: GuideTracePoint[];
  dithers: number[];
  photos: string[]; // "HH:MM" capture times
  windows: SessionWindow[];
  sessionStart: string;
  sessionEnd: string;
  rms?: number; // total RMS ("), drawn as a reference band
}) {
  if (!points.length) return null;
  const RA = "#6ea8fe";
  const DEC = "#f26d6d";
  const startMin = hmToMin(sessionStart);
  const endMin = Math.max(hmToMin(sessionEnd), points[points.length - 1].t);
  const span = Math.max(1, endMin - startMin);

  const PX_PER_MIN = 8;
  const H = 220;
  const M = { top: 18, right: 16, bottom: 26 };
  const AXIS_W = 46; // fixed y-axis gutter (stays put while the plot scrolls)
  const plotH = H - M.top - M.bottom;
  const midY = M.top + plotH / 2;
  const plotW = Math.round(span * PX_PER_MIN) + M.right;

  // Y range: symmetric, driven by the 99th-percentile error (a spike shouldn't set it).
  const absVals = points.flatMap((p) => [Math.abs(p.ra), Math.abs(p.dec)]).sort((a, b) => a - b);
  const p99 = absVals[Math.floor(absVals.length * 0.99)] ?? 2;
  const yMax = Math.max(2, Math.min(8, Math.ceil(p99)));
  // x is local to the scrollable plot svg (0 at session start).
  const x = (min: number) => (min - startMin) * PX_PER_MIN;
  const y = (v: number) => midY - (Math.max(-yMax, Math.min(yMax, v)) / yMax) * (plotH / 2);

  // Break each trace where consecutive points are >5 min apart (window gaps).
  // A run of one sample can't draw a polyline, so those render as dots — else
  // sparse-but-real data (a rough window with frequent star loss) shows blank.
  const segments = (sel: (p: GuideTracePoint) => number) => {
    const segs: { x: number; y: number }[][] = [];
    let cur: { x: number; y: number }[] = [];
    points.forEach((p, i) => {
      if (i > 0 && p.t - points[i - 1].t > 5) { if (cur.length) segs.push(cur); cur = []; }
      cur.push({ x: +x(p.t).toFixed(1), y: +y(sel(p)).toFixed(1) });
    });
    if (cur.length) segs.push(cur);
    return segs;
  };
  const trace = (sel: (p: GuideTracePoint) => number, color: string, key: string, op: number) =>
    segments(sel).map((seg, i) =>
      seg.length > 1 ? (
        <polyline key={`${key}${i}`} points={seg.map((pt) => `${pt.x},${pt.y}`).join(" ")} fill="none" stroke={color} strokeWidth="1" opacity={op} />
      ) : (
        <circle key={`${key}${i}`} cx={seg[0].x} cy={seg[0].y} r="1.1" fill={color} opacity={op} />
      ),
    );

  // Hour + half-hour ticks across the night.
  const ticks: { min: number; label: string }[] = [];
  for (let m = Math.ceil(startMin / 30) * 30; m <= endMin; m += 30) {
    ticks.push({ min: m, label: `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` });
  }
  // Fine gridline at every arcsec; a labelled gridline every `stepY`.
  const yLines = Array.from({ length: yMax * 2 + 1 }, (_, i) => i - yMax);
  const stepY = yMax <= 3 ? 1 : 2;
  const labelled = (v: number) => v === 0 || Math.abs(v) % stepY === 0;
  const band = rms && rms > 0 ? Math.min(rms, yMax) : 0;

  return (
    <div className="flex rounded-[4px] bg-surface-2 ring-1 ring-hairline">
      {/* fixed y-axis — does not scroll, so the vertical reference never leaves view */}
      <svg width={AXIS_W} height={H} viewBox={`0 0 ${AXIS_W} ${H}`} className="shrink-0" style={{ display: "block", fontFamily: "inherit", fontSize: 10 }}>
        {yLines.filter(labelled).map((v) => (
          <g key={v}>
            <line x1={AXIS_W - 4} x2={AXIS_W} y1={y(v)} y2={y(v)} stroke={GRID} />
            <text x={AXIS_W - 7} y={y(v) + 3} textAnchor="end" fill={v === 0 ? MUTED : "rgba(154,163,189,0.7)"}>{v > 0 ? `+${v}` : v}&quot;</text>
          </g>
        ))}
        <text x={4} y={M.top - 6} fill="rgba(154,163,189,0.7)" style={{ fontSize: 9 }}>arcsec</text>
        <line x1={AXIS_W - 0.5} x2={AXIS_W - 0.5} y1={M.top} y2={M.top + plotH} stroke={GRID} />
      </svg>

      {/* scrollable plot */}
      <div className="min-w-0 flex-1 overflow-x-auto">
        <svg width={plotW} height={H} viewBox={`0 0 ${plotW} ${H}`} style={{ display: "block", fontFamily: "inherit", fontSize: 10 }}>
          {/* imaging windows shaded */}
          {windows.map((w, i) => {
            const a = x(hmToMin(w.start));
            const b = x(hmToMin(w.end));
            return <rect key={i} x={a} y={M.top} width={Math.max(0, b - a)} height={plotH} fill={RA} opacity="0.05" />;
          })}
          {/* ±RMS reference band — the typical error, so peaks read against it */}
          {band > 0 && (
            <>
              <rect x={0} y={y(band)} width={plotW} height={y(-band) - y(band)} fill="rgba(255,255,255,0.05)" />
              <line x1={0} x2={plotW} y1={y(band)} y2={y(band)} stroke="rgba(255,255,255,0.14)" strokeWidth="0.75" strokeDasharray="2,3" />
              <line x1={0} x2={plotW} y1={y(-band)} y2={y(-band)} stroke="rgba(255,255,255,0.14)" strokeWidth="0.75" strokeDasharray="2,3" />
            </>
          )}
          {/* y gridlines */}
          {yLines.map((v) => (
            <line key={v} x1={0} x2={plotW} y1={y(v)} y2={y(v)}
              stroke={v === 0 ? "rgba(255,255,255,0.22)" : GRID}
              strokeWidth={v === 0 ? 1 : 0.5}
              opacity={labelled(v) ? 1 : 0.5} />
          ))}
          {/* dither markers */}
          {dithers.map((d, i) => (
            <line key={i} x1={x(d)} y1={M.top} x2={x(d)} y2={M.top + plotH} stroke="#c4b5fd" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
          ))}
          {/* photo (light frame) ticks along the top */}
          {photos.map((p, i) => (
            <line key={i} x1={x(hmToMin(p))} y1={M.top} x2={x(hmToMin(p))} y2={M.top + 5} stroke="#f5b34a" strokeWidth="1.5" opacity="0.8" />
          ))}
          {/* Dec then RA traces (polylines, with orphan samples as dots) */}
          {trace((p) => p.dec, DEC, "d", 0.85)}
          {trace((p) => p.ra, RA, "r", 0.9)}
          {/* x axis */}
          <line x1={0} y1={M.top + plotH} x2={plotW} y2={M.top + plotH} stroke={GRID} />
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={x(t.min)} y1={M.top + plotH} x2={x(t.min)} y2={M.top + plotH + 4} stroke={GRID} />
              <text x={x(t.min)} y={M.top + plotH + 16} textAnchor="middle" fill={MUTED}>{t.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/**
 * Small moon-phase glyph lit to `illumPct`. The terminator is a half-ellipse
 * whose width is r·|1−2f| (f = illuminated fraction); the lit limb sits on the
 * right when waxing, the left when waning (Northern-hemisphere convention).
 */
export function MoonPhase({
  illumPct,
  waxing,
  size = 30,
}: {
  illumPct: number;
  waxing: boolean;
  size?: number;
}) {
  const r = size / 2 - 1;
  const c = size / 2;
  const f = Math.min(1, Math.max(0, illumPct / 100));
  const dark = "#232a44";
  const lit = "#e9edf6";

  let litEl: React.ReactNode;
  if (f <= 0.015) {
    litEl = null; // new moon
  } else if (f >= 0.985) {
    litEl = <circle cx={c} cy={c} r={r} fill={lit} />;
  } else {
    const rx = Math.abs(r * (1 - 2 * f));
    const top = `${c},${c - r}`;
    const bot = `${c},${c + r}`;
    const limbSweep = waxing ? 1 : 0; // lit limb on right (waxing) / left (waning)
    // Crescent (f<0.5): terminator bulges toward the dark side; gibbous: toward lit.
    const crescent = f < 0.5;
    const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
    litEl = (
      <path d={`M${top} A${r},${r} 0 0 ${limbSweep} ${bot} A${rx},${r} 0 0 ${termSweep} ${top} Z`} fill={lit} />
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill={dark} />
      {litEl}
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
    </svg>
  );
}
