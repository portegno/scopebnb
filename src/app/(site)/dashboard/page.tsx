"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Section, Eyebrow, Card, CTA } from "@/components/ui";
import { db } from "@/lib/firebase/client";
import { useAuth, signOut } from "@/lib/firebase/useAuth";
import { BookingDetailBody, fmtHour } from "@/components/BookingDetailBody";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking } from "@/lib/bookings/types";

export default function Dashboard() {
  const { user, loading, enabled } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline expansion: the open booking + the grid's live column count, so the
  // full-width detail panel can slot in at the end of the selected card's row.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cols, setCols] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () =>
      setCols(getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length || 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bookings.length]);

  useEffect(() => {
    if (selectedId) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

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

      <div ref={gridRef} className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bookings.map((b, i) => {
          const open = selectedId === b.id;
          // The detail panel slots in after the last card of the selected card's
          // row (clamped to the final card), spanning the full width.
          const selectedIndex = selectedId ? bookings.findIndex((x) => x.id === selectedId) : -1;
          const insertAfter =
            selectedIndex >= 0
              ? Math.min((Math.floor(selectedIndex / cols) + 1) * cols - 1, bookings.length - 1)
              : -1;
          const selected = selectedIndex >= 0 ? bookings[selectedIndex] : null;
          return (
            <Fragment key={b.id}>
              <button
                type="button"
                onClick={() => setSelectedId((id) => (id === b.id ? null : b.id))}
                aria-expanded={open}
                className={`group block overflow-hidden rounded-[4px] bg-surface text-left transition-colors ${
                  open ? "ring-2 ring-accent" : "ring-1 ring-hairline hover:ring-accent/40"
                }`}
              >
                {b.previewImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.previewImage} alt={b.targetName ?? "Framing"} className="w-full" />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{b.targetName ?? "Target"}</h3>
                    <StatusBadge status={b.status} />
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
                  <p
                    className={`mt-3 text-xs font-medium text-accent transition-opacity ${
                      open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {open ? "Hide details" : "View details →"}
                  </p>
                </div>
              </button>

              {i === insertAfter && selected && (
                <div ref={panelRef} className="detail-reveal col-span-full scroll-mt-24">
                  <div className="relative rounded-[4px] bg-surface p-5 ring-2 ring-accent sm:p-6">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      aria-label="Close details"
                      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[4px] bg-background/60 text-muted backdrop-blur hover:bg-surface-2 hover:text-foreground"
                    >
                      ✕
                    </button>
                    <BookingDetailBody booking={selected} />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </Section>
  );
}
