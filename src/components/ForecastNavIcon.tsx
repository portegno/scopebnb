"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Nav link to /forecast with a realistic weather glyph for the CURRENT hour
 * (clear / partly cloudy / cloudy / rain, day or night). Icons are the static
 * AmCharts-style set from Makin-Things/weather-icons (in /public/images/weather).
 * Fetches the cached /api/forecast once on mount.
 */
type Cond = "clear" | "partly" | "cloudy" | "rain";

const LABEL: Record<Cond, string> = {
  clear: "Clear",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
};

function classify(cloud: number, precip: number | null): Cond {
  if (precip != null && precip >= 40) return "rain";
  if (cloud < 25) return "clear";
  if (cloud < 60) return "partly";
  return "cloudy";
}

/** Map a condition (and day/night) to its weather-icon file. */
function iconFile(cond: Cond, isDark: boolean): string {
  if (cond === "rain") return "rainy-3";
  if (cond === "cloudy") return "cloudy";
  if (cond === "clear") return isDark ? "clear-night" : "clear-day";
  return isDark ? "cloudy-1-night" : "cloudy-1-day"; // partly
}

export function ForecastNavIcon({
  transparent = false,
  active = false,
  className,
  onClick,
}: {
  transparent?: boolean;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const [now, setNow] = useState<{ cond: Cond; isDark: boolean } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/forecast")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.days) return;
        const hours = d.days.flatMap(
          (dy: { hours: { epoch: number; cloudTotal: number; precipProb: number | null; isDark: boolean }[] }) => dy.hours,
        );
        const t = Date.now();
        let best = hours[0];
        let bestDist = Infinity;
        for (const h of hours) {
          const dist = Math.abs(h.epoch - t);
          if (dist < bestDist) {
            bestDist = dist;
            best = h;
          }
        }
        if (best) setNow({ cond: classify(best.cloudTotal, best.precipProb), isDark: best.isDark });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const file = now ? iconFile(now.cond, now.isDark) : "cloudy";

  return (
    <Link
      href="/forecast"
      onClick={onClick}
      title={now ? `Sky forecast — ${LABEL[now.cond]} now` : "Sky forecast"}
      className={
        className ??
        `inline-flex items-center gap-1.5 text-sm leading-none transition-colors ${
          transparent
            ? active
              ? "font-medium text-gold"
              : "text-white/90 hover:text-gold"
            : active
              ? "font-medium text-accent"
              : "text-muted hover:text-foreground"
        }`
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* These AmCharts glyphs sit slightly high in their box (drop-shadow
          padding below), so nudge down a touch to optically center with text. */}
      <img
        src={`/images/weather/${file}.svg`}
        alt=""
        className="h-8 w-auto shrink-0 translate-y-[5px]"
      />
      Forecast
    </Link>
  );
}
