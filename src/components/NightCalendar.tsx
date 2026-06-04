"use client";

import { useState, type CSSProperties } from "react";
import { moonIllumination } from "@/lib/visibility";
import { nightTier, fmtPrice } from "@/lib/pricing";

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
}: {
  selected: string;
  onSelect: (ymd: string) => void;
  utcOffset: number;
  today: string; // YYYY-MM-DD
  reserved?: Set<string>; // booked nights (YYYY-MM-DD), shown as unavailable
}) {
  const [tY, tM, tD] = today.split("-").map(Number);
  const [view, setView] = useState({ y: tY, m: tM - 1 }); // m is 0-indexed

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
    <div className="rounded-xl bg-surface p-5 ring-1 ring-hairline">
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

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
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
          const booked = !tooSoon && !!reserved?.has(ymd);
          const illum = moonIllumination(jdForLocalMidnight(view.y, view.m, d, utcOffset)).fraction;
          const q = nightTier(illum);
          const isSel = ymd === selected;
          const disabled = tooSoon || booked;
          return (
            <button
              key={ymd}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(ymd)}
              title={
                isToday
                  ? "Too soon — same-day bookings can't be processed"
                  : tooSoon
                    ? "Past"
                    : booked
                      ? "Booked. Choose another night"
                      : `${Math.round(illum * 100)}% moon · ${q.label} · ${fmtPrice(q.price)}/night`
              }
              style={
                disabled
                  ? undefined
                  : isSel
                    ? { backgroundColor: q.color }
                    : ({ boxShadow: `inset 0 0 0 1px ${q.color}`, "--tier-bg": `${q.color}33` } as CSSProperties)
              }
              className={`flex aspect-square items-center justify-center rounded-md text-sm transition-colors ${
                tooSoon
                  ? "cursor-not-allowed text-muted/30"
                  : booked
                    ? "cursor-not-allowed text-muted/40 line-through"
                    : isSel
                      ? "font-semibold text-background"
                      : "cal-day text-foreground"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {reserved && reserved.size > 0 && (
        <p className="mt-4 text-[11px] text-muted">
          Outlined nights are available · <span className="line-through">struck-through</span> nights are
          already booked
        </p>
      )}
    </div>
  );
}
