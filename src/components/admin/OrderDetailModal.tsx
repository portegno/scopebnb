"use client";

import type { ReactNode } from "react";
import type { Booking } from "@/lib/bookings/types";
import { StatusBadge } from "@/components/StatusBadge";

export const fmtHour = (h: number) =>
  `${String(((Math.floor(h) % 24) + 24) % 24).padStart(2, "0")}:${String(
    Math.round((h - Math.floor(h)) * 60),
  ).padStart(2, "0")}`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDate = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

/** One labelled row in the light detail sheet. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-right text-sm text-slate-800">{children}</dd>
    </div>
  );
}

/** Light-themed order detail sheet for the admin dashboard. */
export function OrderDetailModal({
  booking,
  onClose,
  extraRows,
  footer,
}: {
  booking: Booking;
  onClose: () => void;
  extraRows?: ReactNode;
  footer?: ReactNode;
}) {
  const b = booking;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[4px] bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[4px] bg-white/80 text-slate-400 backdrop-blur hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>

        {b.previewImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.previewImage} alt={b.targetName ?? "Framing"} className="w-full" />
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{b.targetName ?? "Target"}</h2>
            <StatusBadge status={b.status} light />
          </div>

          <dl className="mt-4 divide-y divide-slate-100">
            <Row label="Product">{b.product === "remote" ? "Remote Control" : "Managed Imaging"}</Row>
            <Row label="Night">{b.date ?? "Not set"}</Row>
            {b.sessionStart != null && b.sessionEnd != null && (
              <Row label="Session">
                {fmtHour(b.sessionStart)}–{fmtHour(b.sessionEnd)}
                {b.durationHours != null && <span className="text-slate-400"> · {b.durationHours}h</span>}
              </Row>
            )}
            {b.maxAltitude != null && <Row label="Peak altitude">{b.maxAltitude}°</Row>}
            {b.darkHours != null && <Row label="Astronomical dark">{b.darkHours}h</Row>}
            {b.moon && (
              <Row label="Moon">
                {b.moon.phase} · {b.moon.illumPct}% lit · {b.moon.separationDeg}° away
              </Row>
            )}
            {(b.ra != null || b.dec != null) && (
              <Row label="Coordinates">
                RA {b.ra?.toFixed(3)}° · Dec {b.dec?.toFixed(3)}°
              </Row>
            )}
            {b.rotation != null && <Row label="Rotation">{b.rotation.toFixed(1)}°</Row>}
            {b.mosaic && b.mosaic.panels.length > 1 && (
              <Row label="Mosaic">
                {b.mosaic.cols}×{b.mosaic.rows} · {b.mosaic.panels.length} panels ·{" "}
                {Math.round(b.mosaic.overlap * 100)}% overlap
              </Row>
            )}
            {b.priceUsd != null && (
              <Row label="Price">
                ${b.priceUsd}
                {b.nightTier && <span className="text-slate-400"> · {cap(b.nightTier)} night</span>}
              </Row>
            )}
            {b.createdAt?.seconds && <Row label="Requested">{fmtDate(b.createdAt.seconds)}</Row>}
            {extraRows}
            <Row label="Booking ID">
              <span className="font-mono text-xs">{b.id}</span>
            </Row>
          </dl>

          {footer}
        </div>
      </div>
    </div>
  );
}
