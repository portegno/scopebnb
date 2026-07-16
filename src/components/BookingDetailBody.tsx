"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Booking } from "@/lib/bookings/types";
import { StatusBadge } from "@/components/StatusBadge";
import { CapturePlanDetail } from "@/components/CapturePlanDetail";
import { INTEGRATION_FEE } from "@/lib/pricing";

export const fmtHour = (h: number) =>
  `${String(((Math.floor(h) % 24) + 24) % 24).padStart(2, "0")}:${String(
    Math.round((h - Math.floor(h)) * 60),
  ).padStart(2, "0")}`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const fmtDate = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/** One labelled row in the detail sheet. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-right text-sm text-foreground/90">{children}</dd>
    </div>
  );
}

/**
 * Booking detail content (no overlay chrome): a wide layout with the framing
 * preview beside the spec list + capture plan. Used by the dashboard's inline
 * expansion; reusable for a standalone detail page.
 */
export function BookingDetailBody({ booking }: { booking: Booking }) {
  const b = booking;
  return (
    <div className={b.previewImage ? "grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]" : ""}>
      {b.previewImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.previewImage}
          alt={b.targetName ?? "Framing"}
          className="h-fit w-full rounded-[4px] ring-1 ring-hairline"
        />
      )}

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight">{b.targetName ?? "Target"}</h3>
          <StatusBadge status={b.status} />
        </div>

        {b.reportId && (
          <Link
            href={`/report/${b.reportId}`}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-[4px] bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-accent/90"
          >
            View session report →
          </Link>
        )}

        <dl className="mt-3 divide-y divide-hairline">
          <Row label="Product">{b.product === "remote" ? "Remote Control" : "Managed Imaging"}</Row>
          <Row label="Night">{b.date ?? "Not set"}</Row>
          {b.sessionStart != null && b.sessionEnd != null && (
            <Row label="Session">
              {fmtHour(b.sessionStart)}–{fmtHour(b.sessionEnd)}
              {b.durationHours != null && <span className="text-muted"> · {b.durationHours}h</span>}
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
              ${b.priceUsd + (b.wantsIntegration ? INTEGRATION_FEE : 0)}
              {b.nightTier && <span className="text-muted"> · {cap(b.nightTier)} night</span>}
              {b.wantsIntegration && <span className="text-muted"> + ${INTEGRATION_FEE} integration</span>}
            </Row>
          )}
          {b.product !== "remote" && (
            <Row label="Deliverable">
              Lights + calibration frames
              {b.wantsIntegration && <span className="text-gold-soft"> · integrated image</span>}
            </Row>
          )}
          {b.createdAt?.seconds && <Row label="Requested">{fmtDate(b.createdAt.seconds)}</Row>}
          <Row label="Booking ID">
            <span className="font-mono text-xs">{b.id}</span>
          </Row>
        </dl>

        <CapturePlanDetail booking={b} />
      </div>
    </div>
  );
}
