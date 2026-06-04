"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Section, Eyebrow, Card, CTA } from "@/components/ui";
import { db } from "@/lib/firebase/client";
import { useAuth, signOut } from "@/lib/firebase/useAuth";

type Booking = {
  id: string;
  targetName?: string;
  date?: string;
  sessionStart?: number;
  sessionEnd?: number;
  durationHours?: number;
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

export default function Dashboard() {
  const { user, loading, enabled } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your bookings</h1>
          <p className="mt-2 text-sm text-muted">{user.email ?? "Signed in"}</p>
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
          <Card key={b.id} className="overflow-hidden p-0">
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
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
