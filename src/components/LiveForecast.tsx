"use client";

import { useEffect, useState } from "react";
import { SkyForecast } from "@/components/SkyForecast";
import { demoForecast } from "@/data/demoForecast";
import type { ForecastDay } from "@/lib/weather";

/**
 * Fetches the REAL forecast from /api/forecast (Open-Meteo + 7Timer + moon) and
 * renders the grid. Falls back to the demo fixture only if the request fails,
 * so the page always shows something.
 */
export function LiveForecast() {
  const [days, setDays] = useState<ForecastDay[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/forecast")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (d?.days?.length) setDays(d.days as ForecastDay[]);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!days && !failed) {
    return (
      <div className="rounded-[4px] bg-surface p-10 text-center text-sm text-muted ring-1 ring-hairline">
        Loading live forecast…
      </div>
    );
  }

  return <SkyForecast days={days ?? demoForecast} />;
}
