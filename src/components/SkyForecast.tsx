import { METRIC_ROWS, TIER_STYLE, type ForecastDay, type Tier } from "@/lib/weather";

/**
 * Weekly astrophotography sky forecast — our own take on the Clear Outside grid.
 *
 * Pure & presentational: hand it `ForecastDay[]` (demo fixture or live data
 * from /api/forecast) and it renders. No fetching, no state, no borders —
 * cells are separated by spacing and colour, corners are 4px, night columns
 * read full-strength while daytime is dimmed (it's when you can't image).
 *
 * Fixed row heights keep the sticky label column aligned with every day block
 * across horizontal scroll.
 */
const TITLE_H = 34;
const HOUR_H = 18;
const ROW_H = 24;
const CELL_W = 26;
const LABEL_W = 116;
const GAP = 2;

const LEGEND: { tier: Tier; label: string }[] = [
  { tier: "excellent", label: "Excellent" },
  { tier: "good", label: "Good" },
  { tier: "fair", label: "Fair" },
  { tier: "poor", label: "Poor" },
];

function Cell({ text, tier, dim }: { text: string; tier: Tier; dim: boolean }) {
  const { bg, fg } = TIER_STYLE[tier];
  return (
    <div
      style={{
        width: CELL_W,
        height: ROW_H,
        background: bg,
        color: fg,
        opacity: dim ? 0.38 : 1,
        borderRadius: 4,
        fontSize: 11,
        fontVariantNumeric: "tabular-nums",
      }}
      className="flex shrink-0 items-center justify-center font-medium"
    >
      {text}
    </div>
  );
}

function DayBlock({ day }: { day: ForecastDay }) {
  return (
    <div className="shrink-0" style={{ marginRight: 14 }}>
      {/* Day title + moon */}
      <div
        style={{ height: TITLE_H }}
        className="flex flex-col justify-center"
      >
        <div className="text-xs font-semibold text-foreground">{day.label}</div>
        <div className="text-[10px] text-muted">
          🌙 {day.moonIllumPct}% · {day.moonPhase}
        </div>
      </div>

      {/* Hour numbers */}
      <div className="flex" style={{ height: HOUR_H, gap: GAP }}>
        {day.hours.map((h) => (
          <div
            key={h.hour}
            style={{ width: CELL_W }}
            className={`shrink-0 text-center text-[9px] tabular-nums ${
              h.isDark ? "text-accent" : "text-muted/50"
            }`}
          >
            {h.hour}
          </div>
        ))}
      </div>

      {/* One row per metric */}
      <div className="flex flex-col" style={{ gap: GAP, marginTop: GAP }}>
        {METRIC_ROWS.map((row) => (
          <div key={row.key} className="flex" style={{ height: ROW_H, gap: GAP }}>
            {day.hours.map((h) => {
              const v = row.value(h);
              return (
                <Cell
                  key={h.hour}
                  text={row.format(v)}
                  tier={row.rate(v)}
                  dim={!h.isDark}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkyForecast({
  days,
  title = "7-night sky forecast",
}: {
  days: ForecastDay[];
  title?: string;
}) {
  return (
    <div className="rounded-xl bg-surface p-5 ring-1 ring-hairline">
      {/* Header + legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted">
            Rockwood, TX · Bortle 1 · numbers rated for imaging quality
          </p>
        </div>
        <div className="flex items-center gap-3">
          {LEGEND.map((l) => (
            <div key={l.tier} className="flex items-center gap-1.5">
              <span
                style={{ background: TIER_STYLE[l.tier].bg, borderRadius: 3 }}
                className="inline-block h-3 w-3"
              />
              <span className="text-[10px] text-muted">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: sticky labels + horizontally-scrollable day blocks */}
      <div className="flex">
        {/* Label column */}
        <div className="shrink-0 pr-3" style={{ width: LABEL_W }}>
          <div style={{ height: TITLE_H }} />
          <div style={{ height: HOUR_H }} className="text-[9px] text-muted/60">
            Local hour
          </div>
          <div className="flex flex-col" style={{ gap: GAP, marginTop: GAP }}>
            {METRIC_ROWS.map((row) => (
              <div
                key={row.key}
                style={{ height: ROW_H }}
                className="flex items-center text-[11px] text-muted"
              >
                {row.label}
              </div>
            ))}
          </div>
        </div>

        {/* Day blocks */}
        <div className="flex overflow-x-auto pb-1">
          {days.map((day) => (
            <DayBlock key={day.date} day={day} />
          ))}
        </div>
      </div>

      <p className="mt-4 text-[10px] text-muted/70">
        Cloud, wind, humidity, dew &amp; visibility from Open-Meteo · seeing &amp;
        transparency from 7Timer · moon computed locally. Updated hourly.
      </p>
    </div>
  );
}
