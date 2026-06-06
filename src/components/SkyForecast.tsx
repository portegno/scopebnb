"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { METRIC_ROWS, METRIC_HELP, TIER_STYLE, type ForecastDay, type Tier } from "@/lib/weather";

/**
 * Weekly astrophotography sky forecast — our own take on the Clear Outside grid.
 *
 * Pure & presentational: hand it `ForecastDay[]` (demo fixture or live data
 * from /api/forecast). No borders — cells are separated by spacing and colour,
 * corners are 4px, night columns read full-strength while daytime is dimmed.
 *
 * Hovering a metric label "isolates" that row: the rest of the grid darkens so
 * you can read just that strip, and its explanation appears in the header.
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

// Memoized so a focus change only re-renders the cells whose opacity actually
// changes (the focused + previously-focused rows), not all ~2000 cells —
// keeps row-to-row hovering smooth.
const Cell = memo(function Cell({ text, tier, opacity }: { text: string; tier: Tier; opacity: number }) {
  const { bg, fg } = TIER_STYLE[tier];
  return (
    <div
      style={{
        width: CELL_W,
        height: ROW_H,
        background: bg,
        color: fg,
        opacity,
        borderRadius: 4,
        fontSize: 11,
        fontVariantNumeric: "tabular-nums",
      }}
      className="flex shrink-0 items-center justify-center font-medium"
    >
      {text}
    </div>
  );
});

function DayBlock({ day, focused }: { day: ForecastDay; focused: string | null }) {
  return (
    <div className="shrink-0" style={{ marginRight: 14 }}>
      {/* Day + moon (emoji · illumination · phase) on one row, gapped apart. */}
      <div style={{ height: TITLE_H }} className="flex items-center gap-2.5">
        <span className="text-xs font-semibold text-foreground">{day.label}</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-muted">
          <span className="leading-none">🌙</span>
          {day.moonIllumPct}% · {day.moonPhase}
        </span>
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
        {METRIC_ROWS.map((row) => {
          const isFocusedRow = focused === row.key;
          return (
            <div key={row.key} className="flex" style={{ height: ROW_H, gap: GAP }}>
              {day.hours.map((h) => {
                const v = row.value(h);
                // Focus mode: the hovered row reads full, everything else darkens.
                // Otherwise: night full-strength, daytime dimmed.
                // Focus mode: only the hovered row stays lit — and it still
                // respects the night-only convention (daytime dimmed). Every
                // other row goes very dark.
                const opacity = focused
                  ? isFocusedRow
                    ? h.isDark
                      ? 1
                      : 0.12
                    : 0.06
                  : h.isDark
                    ? 1
                    : 0.12;
                return <Cell key={h.hour} text={row.format(v)} tier={row.rate(v)} opacity={opacity} />;
              })}
            </div>
          );
        })}
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const focusedRow = focused ? METRIC_ROWS.find((r) => r.key === focused) : null;

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows, days]);

  const scrollByDir = (dir: 1 | -1) =>
    scrollRef.current?.scrollBy({ left: dir * scrollRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="rounded-xl bg-surface p-5 ring-1 ring-hairline">
      {/* Header: title (left) · metric explanation (center, on hover) · legend (right) */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="shrink-0">
          <h3 className="text-sm font-semibold text-foreground">{title} · Rockwood, TX</h3>
        </div>

        {/* Center explanation slot — fills when a metric row is hovered. */}
        <div className="hidden min-w-0 flex-1 px-2 text-center sm:block" aria-live="polite">
          {focusedRow && (
            <div className="mx-auto max-w-md">
              <p className="text-sm font-semibold text-gold">{focusedRow.label}</p>
              <p className="text-xs leading-snug text-gold-soft">{METRIC_HELP[focusedRow.key]}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
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
          {/* Hover by Y-coordinate: every pixel (including the 2px gaps) maps to
              a row, so there's no dead zone between labels to flicker focus. */}
          <div
            className="flex flex-col"
            style={{ gap: GAP, marginTop: GAP }}
            onMouseMove={(e) => {
              const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
              const i = Math.min(
                METRIC_ROWS.length - 1,
                Math.max(0, Math.floor(y / (ROW_H + GAP))),
              );
              setFocused(METRIC_ROWS[i].key);
            }}
            onMouseLeave={() => setFocused(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(null);
            }}
          >
            {METRIC_ROWS.map((row) => {
              const isFocused = focused === row.key;
              return (
                <button
                  type="button"
                  key={row.key}
                  onFocus={() => setFocused(row.key)}
                  style={{ height: ROW_H }}
                  className={`flex w-full cursor-help items-center text-left text-[11px] transition-colors ${
                    isFocused
                      ? "font-semibold text-foreground"
                      : focused
                        ? "text-muted/30"
                        : "text-muted hover:text-foreground"
                  }`}
                >
                  {row.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day blocks (scrollable) with edge arrows + fade hints */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={updateArrows}
            className="no-scrollbar flex overflow-x-auto pb-1"
          >
            {days.map((day) => (
              <DayBlock key={day.date} day={day} focused={focused} />
            ))}
          </div>

          {/* Left arrow + fade */}
          {canLeft && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-surface to-transparent" />
              <button
                type="button"
                aria-label="Previous days"
                onClick={() => scrollByDir(-1)}
                className="absolute left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2/90 text-foreground ring-1 ring-hairline backdrop-blur transition-colors hover:bg-surface-2"
              >
                ‹
              </button>
            </>
          )}

          {/* Right arrow + fade */}
          {canRight && (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent" />
              <button
                type="button"
                aria-label="More days"
                onClick={() => scrollByDir(1)}
                className="absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2/90 text-foreground ring-1 ring-hairline backdrop-blur transition-colors hover:bg-surface-2"
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="group relative cursor-help text-[10px] text-muted/70 underline decoration-dotted decoration-muted/40 underline-offset-2 hover:text-muted">
          Sources
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-72 rounded-lg bg-surface-2 px-3 py-2 text-left text-[11px] leading-snug text-foreground/90 opacity-0 shadow-xl ring-1 ring-hairline transition-opacity duration-150 group-hover:opacity-100"
          >
            Cloud, wind, humidity, dew &amp; visibility from <strong className="font-semibold text-foreground">Open-Meteo</strong> · seeing &amp; transparency from <strong className="font-semibold text-foreground">7Timer</strong> · moon computed locally. Updated hourly.
          </span>
        </span>
      </div>
    </div>
  );
}
