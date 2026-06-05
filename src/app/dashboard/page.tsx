"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Section, Eyebrow, Card, CTA } from "@/components/ui";
import { db } from "@/lib/firebase/client";
import { useAuth, signOut } from "@/lib/firebase/useAuth";

type Booking = {
  id: string;
  product?: "managed" | "remote";
  targetName?: string;
  ra?: number;
  dec?: number;
  rotation?: number;
  mosaic?: { cols: number; rows: number; overlap: number; panels: { ra: number; dec: number }[] } | null;
  date?: string;
  sessionStart?: number;
  sessionEnd?: number;
  durationHours?: number;
  priceUsd?: number;
  nightTier?: string;
  maxAltitude?: number;
  darkHours?: number;
  moon?: { illumPct: number; separationDeg: number; phase: string } | null;
  previewImage?: string;
  status?: string;
  createdAt?: { seconds: number } | null;
};

const fmtHour = (h: number) =>
  `${String(((Math.floor(h) % 24) + 24) % 24).padStart(2, "0")}:${String(
    Math.round((h - Math.floor(h)) * 60),
  ).padStart(2, "0")}`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One labelled row in the session detail sheet. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="text-right text-sm text-foreground/90">{children}</dd>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading, enabled } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    setBusy(true);
    setError(null);
    getDocs(query(collection(db, "bookings"), where("userId", "==", user.uid)))
      .then((snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking);
        rows.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setBookings(rows);
      })
      .catch((e) => setError(e instanceof Error ? e.message.replace(/^Firebase:\s*/, "") : "Could not load"))
      .finally(() => setBusy(false));
  }, [user]);

  if (loading) {
    return (
      <Section>
        <p className="text-sm text-muted">Loading…</p>
      </Section>
    );
  }

  if (!enabled) {
    return (
      <Section>
        <Eyebrow>Account</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-4 text-sm text-amber-300">Firebase isn&apos;t configured yet.</p>
      </Section>
    );
  }

  if (!user) {
    return (
      <Section className="max-w-md">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to see your bookings</h1>
          <div className="mt-6 flex justify-center gap-3">
            <CTA href="/login">Log in</CTA>
            <CTA href="/signup" variant="secondary">
              Sign up
            </CTA>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Account</Eyebrow>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            {user.displayName?.trim()
              ? `Welcome back, ${user.displayName.trim().split(/\s+/)[0]}`
              : "Your bookings"}
          </h1>
        </div>
        <button onClick={() => signOut()} className="text-sm text-muted hover:text-foreground">
          Log out
        </button>
      </div>

      {busy && <p className="mt-8 text-sm text-muted">Loading your sessions…</p>}
      {error && <p className="mt-8 text-sm text-red-300">{error}</p>}

      {!busy && !error && bookings.length === 0 && (
        <Card className="mt-8 text-center">
          <p className="text-sm text-muted">No bookings yet.</p>
          <div className="mt-4 flex justify-center">
            <CTA href="/book">Book a night</CTA>
          </div>
        </Card>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelected(b)}
            className="group block overflow-hidden rounded-xl bg-surface text-left ring-1 ring-hairline transition-colors hover:ring-accent/40"
          >
            {b.previewImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.previewImage} alt={b.targetName ?? "Framing"} className="w-full" />
            )}
            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{b.targetName ?? "Target"}</h3>
                <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted">
                  {b.status ?? "requested"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {b.date}
                {b.sessionStart != null && b.sessionEnd != null && (
                  <>
                    {" "}· {fmtHour(b.sessionStart)}–{fmtHour(b.sessionEnd)}
                  </>
                )}
              </p>
              {(b.maxAltitude != null || b.moon) && (
                <p className="mt-1 text-xs text-muted">
                  {b.maxAltitude != null && <>peaks {b.maxAltitude}° · {b.darkHours}h dark</>}
                  {b.moon && <> · Moon {b.moon.illumPct}% @ {b.moon.separationDeg}°</>}
                </p>
              )}
              <p className="mt-3 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                View details →
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Session detail sheet — full info for the tapped booking. */}
      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 sm:p-6"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface ring-1 ring-hairline"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md bg-background/60 text-muted backdrop-blur hover:bg-surface-2 hover:text-foreground"
            >
              ✕
            </button>

            {selected.previewImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.previewImage}
                alt={selected.targetName ?? "Framing"}
                className="w-full"
              />
            )}

            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight">{selected.targetName ?? "Target"}</h2>
                <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted">
                  {selected.status ?? "requested"}
                </span>
              </div>

              <dl className="mt-4 divide-y divide-hairline">
                <Row label="Product">
                  {selected.product === "remote" ? "Remote Control" : "Managed Imaging"}
                </Row>
                <Row label="Night">{selected.date ?? "—"}</Row>
                {selected.sessionStart != null && selected.sessionEnd != null && (
                  <Row label="Session">
                    {fmtHour(selected.sessionStart)}–{fmtHour(selected.sessionEnd)}
                    {selected.durationHours != null && (
                      <span className="text-muted"> · {selected.durationHours}h</span>
                    )}
                  </Row>
                )}
                {selected.maxAltitude != null && (
                  <Row label="Peak altitude">{selected.maxAltitude}°</Row>
                )}
                {selected.darkHours != null && (
                  <Row label="Astronomical dark">{selected.darkHours}h</Row>
                )}
                {selected.moon && (
                  <Row label="Moon">
                    {selected.moon.phase} · {selected.moon.illumPct}% lit · {selected.moon.separationDeg}° away
                  </Row>
                )}
                {(selected.ra != null || selected.dec != null) && (
                  <Row label="Coordinates">
                    RA {selected.ra?.toFixed(3)}° · Dec {selected.dec?.toFixed(3)}°
                  </Row>
                )}
                {selected.rotation != null && (
                  <Row label="Rotation">{selected.rotation.toFixed(1)}°</Row>
                )}
                {selected.mosaic && selected.mosaic.panels.length > 1 && (
                  <Row label="Mosaic">
                    {selected.mosaic.cols}×{selected.mosaic.rows} · {selected.mosaic.panels.length} panels ·{" "}
                    {Math.round(selected.mosaic.overlap * 100)}% overlap
                  </Row>
                )}
                {selected.priceUsd != null && (
                  <Row label="Price">
                    ${selected.priceUsd}
                    {selected.nightTier && <span className="text-muted"> · {cap(selected.nightTier)} night</span>}
                  </Row>
                )}
                {selected.createdAt?.seconds && (
                  <Row label="Requested">
                    {new Date(selected.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Row>
                )}
                <Row label="Booking ID">
                  <span className="font-mono text-xs">{selected.id}</span>
                </Row>
              </dl>
            </div>
          </div>
        </div>
      )}
    </Section>
  );
}
