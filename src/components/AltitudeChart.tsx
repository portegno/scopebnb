import type { AltitudeCurve } from "@/lib/visibility";

/**
 * Classic altitude-vs-time chart for a deep-sky target over one night.
 * Pure SVG, no dependencies. Shades twilight + astronomical darkness,
 * plots the target and the Moon, and marks the usable-altitude line.
 */
const W = 760;
const H = 320;
const M = { top: 16, right: 16, bottom: 34, left: 36 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const ALT_MIN = 30;

export function AltitudeChart({
  curve,
  selection,
}: {
  curve: AltitudeCurve;
  selection?: { start: number; end: number };
}) {
  const { points, startHour, endHour } = curve;

  const x = (hour: number) => M.left + ((hour - startHour) / (endHour - startHour)) * PLOT_W;
  const y = (alt: number) => M.top + (1 - Math.min(90, Math.max(0, alt)) / 90) * PLOT_H;

  const toPath = (sel: (p: (typeof points)[number]) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.hour).toFixed(1)},${y(sel(p)).toFixed(1)}`).join(" ");

  const targetPath = toPath((p) => p.alt);
  const moonPath = toPath((p) => Math.max(0, p.moonAlt));

  const band = (a: number | null, b: number | null, fill: string) =>
    a !== null && b !== null ? (
      <rect x={x(a)} y={M.top} width={x(b) - x(a)} height={PLOT_H} fill={fill} />
    ) : null;

  // Hour ticks every 2h.
  const ticks: number[] = [];
  for (let h = Math.ceil(startHour / 2) * 2; h <= endHour; h += 2) ticks.push(h);
  const hourLabel = (h: number) => `${String((((Math.round(h) % 24) + 24) % 24)).padStart(2, "0")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Target altitude during the night">
      {/* twilight + astronomical darkness shading */}
      {band(curve.nightStart, curve.nightEnd, "rgba(110,168,254,0.06)")}
      {band(curve.darkStart, curve.darkEnd, "rgba(110,168,254,0.12)")}

      {/* altitude gridlines */}
      {[0, 30, 60, 90].map((a) => (
        <g key={a}>
          <line x1={M.left} x2={W - M.right} y1={y(a)} y2={y(a)} stroke="rgba(255,255,255,0.08)" />
          <text x={M.left - 6} y={y(a) + 3} textAnchor="end" fontSize="10" fill="#9aa3bd">
            {a}°
          </text>
        </g>
      ))}

      {/* minimum usable altitude */}
      <line
        x1={M.left}
        x2={W - M.right}
        y1={y(ALT_MIN)}
        y2={y(ALT_MIN)}
        stroke="#b07cff"
        strokeDasharray="4 4"
        strokeWidth="1"
      />

      {/* hour ticks */}
      {ticks.map((h) => (
        <text key={h} x={x(h)} y={H - 12} textAnchor="middle" fontSize="10" fill="#9aa3bd">
          {hourLabel(h)}
        </text>
      ))}

      {/* selected session window */}
      {selection && selection.end > selection.start && (
        <g>
          <rect
            x={x(selection.start)}
            y={M.top}
            width={x(selection.end) - x(selection.start)}
            height={PLOT_H}
            fill="rgba(110,168,254,0.18)"
          />
          {[selection.start, selection.end].map((h) => (
            <line key={h} x1={x(h)} x2={x(h)} y1={M.top} y2={M.top + PLOT_H} stroke="#6ea8fe" strokeWidth="1.5" />
          ))}
        </g>
      )}

      {/* moon then target */}
      <path d={moonPath} fill="none" stroke="#e9c46a" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7" />
      <path d={targetPath} fill="none" stroke="#6ea8fe" strokeWidth="2.5" />

      {/* legend */}
      <g fontSize="10" fill="#9aa3bd">
        <line x1={W - M.right - 150} x2={W - M.right - 134} y1={M.top + 6} y2={M.top + 6} stroke="#6ea8fe" strokeWidth="2.5" />
        <text x={W - M.right - 130} y={M.top + 9}>Target</text>
        <line x1={W - M.right - 86} x2={W - M.right - 70} y1={M.top + 6} y2={M.top + 6} stroke="#e9c46a" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={W - M.right - 66} y={M.top + 9}>Moon</text>
      </g>
    </svg>
  );
}
