"use client";

import { useEffect, useState } from "react";
import { PayPalButton } from "@/components/PayPalButton";
import { HOLD_MINUTES, HOLD_MS } from "@/lib/bookings/hold";

/**
 * Checkout panel with a cinema-style hold countdown. The booking's nights are
 * held for HOLD_MINUTES while the user pays; a live timer shows the remaining
 * time, and when it hits zero the hold is released and we prompt to start over.
 */
export function BookingPayPanel({
  bookingId,
  amountUsd,
  heldUntil,
  label,
  onPaid,
  onReset,
}: {
  bookingId: string;
  amountUsd: number;
  heldUntil: number; // epoch ms when the hold expires
  label: string; // "week" | "night"
  onPaid: () => void;
  onReset: () => void;
}) {
  // Starts at the full window (avoids reading the clock during render) and the
  // effect corrects it on the first tick.
  const [remaining, setRemaining] = useState(HOLD_MS);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, heldUntil - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [heldUntil]);

  const expired = remaining <= 0;
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < 60000;

  if (expired) {
    return (
      <div className="rounded-[4px] bg-surface p-5 ring-1 ring-hairline">
        <p className="text-sm text-amber-300">
          Your {HOLD_MINUTES}-minute hold expired, so the {label} was released. Please pick your dates again.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-[4px] bg-surface-2 px-4 text-sm font-semibold text-foreground hover:bg-surface"
        >
          Pick again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] bg-surface p-5 ring-1 ring-hairline">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Your {label} is held. Pay to confirm:</p>
        <span
          className="inline-flex items-center gap-1.5 rounded-[4px] bg-surface-2 px-2.5 py-1 text-sm tabular-nums"
          title={`We hold these nights for ${HOLD_MINUTES} minutes while you pay`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className={urgent ? "font-semibold text-red-300" : "font-medium text-gold-soft"}>
            {mm}:{String(ss).padStart(2, "0")}
          </span>
        </span>
      </div>
      <div className="mt-3 max-w-sm">
        <PayPalButton bookingId={bookingId} amountUsd={amountUsd} onPaid={onPaid} />
      </div>
      <p className="mt-2 text-xs text-muted">We hold these nights for {HOLD_MINUTES} minutes while you complete payment.</p>
    </div>
  );
}
