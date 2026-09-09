"use client";

import { useState, type CSSProperties } from "react";
import { moonIllumination } from "@/lib/visibility";
import { nightTier, fmtPrice } from "@/lib/pricing";
import { addDaysYmd, ymdSpan } from "@/lib/dates";

/**
 * Month calendar of upcoming nights. Each night shows its moon-darkness quality
 * (new moon = best for imaging). Past nights are disabled. Picking a night
 * drives the rest of the booking flow.
 */
function jdForLocalMidnight(y: number, m: number, d: number, utcOffset: number) {
  const ms = Date.UTC(y, m, d, 0, 0, 0, 0) + (24 - utcOffset) * 3600000;
  return ms / 86400000 + 2440587.5;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function NightCalendar({
  selected,
  onSelect,
  utcOffset,
  today,
  reserved,
  spanNights = 1,
}: {
  selected: string;
  onSelect: (ymd: string) => void;
  utcOffset: number;
  today: string; // YYYY-MM-DD
  reserved?: Set<string>; // booked nights (YYYY-MM-DD), shown as unavailable
  // When > 1, a click picks the FIRST of `spanNights` consecutive nights; only
  // dates whose whole span is free can start, and the span is highlighted.
  spanNights?: number;
}) {
  const span = Math.max(1, spanNights);
  const isReserved = (y: string) => !!reserved?.has(y);
  const [tY, tM, tD] = today.split("-").map(Number);
  const [view, setView] = useState({ y: tY, m: tM - 1 }); // m is 0-indexed
  // Hover preview of the span (multi-night only): shows the nights a start would
  // take before you commit.
  const [hover, setHover] = useState<string | null>(null);

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const todayMs = Date.UTC(tY, tM - 1, tD);
  const atFirstMonth = view.y === tY && view.m === tM - 1;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-[4px] bg-surface p-5 ring-1 ring-hairline">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={atFirstMonth}
            onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
            className="flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-hairline hover:bg-surface-2 disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
            className="flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-hairline hover:bg-surface-2"
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted"
        onMouseLeave={() => setHover(null)}
      >
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const ymd = `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const cellMs = Date.UTC(view.y, view.m, d);
          const isToday = cellMs === todayMs;
          // Today and earlier can't be booked: we can't process a same-day order.
          const tooSoon = cellMs <= todayMs;
          const booked = !tooSoon && isReserved(ymd);
          const illum = moonIllumination(jdForLocalMidnight(view.y, view.m, d, utcOffset)).fraction;
          const q = nightTier(illum);
          // Can a stay START here? For a single night, just not booked. For a
          // week, every night in the span must be free.
          const spanFree = !tooSoon && (span === 1 ? !booked : ymdSpan(ymd, span).every((dd) => !isReserved(dd)));
          const noSpan = span > 1 && !tooSoon && !booked && !spanFree; // free tonight, but no full week from here
          // Selection: `selected` is the start; highlight the whole span. When
          // hovering a valid start, preview that span instead.
          const activeStart = span > 1 ? (hover ?? selected) : selected;
          const selEnd = activeStart ? addDaysYmd(activeStart, span - 1) : "";
          const isStart = activeStart !== "" && ymd === activeStart;
          const inSpan = span > 1 && activeStart !== "" && ymd >= activeStart && ymd <= selEnd && !isStart;
          const disabled = tooSoon || booked || noSpan;
          // Chain the span: draw a connector into the gap toward the next night,
          // unless this is the span's last night, the week's last column, or the
          // last day shown this month.
          const isRowEnd = i % 7 === 6;
          const connectRight = span > 1 && (isStart || inSpan) && ymd !== selEnd && !isRowEnd && d < daysInMonth;
          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(ymd)}
              onMouseEnter={span > 1 && !disabled ? () => setHover(ymd) : undefined}
              title={
                isToday
                  ? "Too soon: same-day bookings can't be processed"
                  : tooSoon
                    ? "Past"
                    : booked
                      ? "Booked. Choose another night"
                      : noSpan
                        ? `Not enough consecutive open nights for a ${span}-night week`
                        : span > 1
                          ? `Start a ${span}-night week here (through ${addDaysYmd(ymd, span - 1)})`
                          : `${Math.round(illum * 100)}% moon · ${q.label} · ${fmtPrice(q.price)}/night`
              }
              style={
                disabled
                  ? undefined
                  : isStart
                    ? // Single night keeps the moon-tier colour (price varies); the week is
                      // one flat price, so its start is a neutral accent, not a tier colour.
                      { backgroundColor: span > 1 ? "#6ea8fe" : q.color }
                    : inSpan
                      ? { backgroundColor: "rgba(110,168,254,0.22)" }
                      : span > 1
                        ? // Week mode: no per-night price tiers, so a neutral outline.
                          ({ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)", "--tier-bg": "rgba(255,255,255,0.06)" } as CSSProperties)
                        : ({ boxShadow: `inset 0 0 0 1px ${q.color}`, "--tier-bg": `${q.color}33` } as CSSProperties)
              }
              className={`relative flex aspect-square items-center justify-center rounded-md text-sm transition-colors ${
                tooSoon
                  ? "cursor-not-allowed text-muted/30"
                  : booked
                    ? "cursor-not-allowed text-muted/40 line-through"
                    : noSpan
                      ? "cursor-not-allowed text-muted/25"
                      : isStart
                        ? "font-semibold text-background"
                        : inSpan
                          ? "font-medium text-foreground"
                          : "cal-day text-foreground"
              }`}
            >
              {connectRight && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-[-7px] z-10 h-[3px] w-3.5 -translate-y-1/2 rounded-full bg-gold"
                />
              )}
              {d}
            </button>
          );
        })}
      </div>

      {span > 1 ? (
        <p className="mt-4 text-[11px] text-muted">
          Pick the first of {span} consecutive nights. Dimmed nights can&apos;t start a full week.
        </p>
      ) : (
        reserved &&
        reserved.size > 0 && (
          <p className="mt-4 text-[11px] text-muted">
            Outlined nights are available · <span className="line-through">struck-through</span> nights are
            already booked
          </p>
        )
      )}
    </div>
  );
}
