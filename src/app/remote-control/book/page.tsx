"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, Eyebrow, Card } from "@/components/ui";
import { NightCalendar } from "@/components/NightCalendar";
import { useAuth } from "@/lib/firebase/useAuth";
import { createBooking } from "@/lib/firebase/bookings";
import { moonIllumination } from "@/lib/visibility";
import { nightTier, fmtPrice, remotePrice, NIGHT_TIERS } from "@/lib/pricing";
import { demoReservedNights } from "@/data/demoReservations";
import { site } from "@/config/site";

function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function RemoteControlBooking() {
  const [selectedDate, setSelectedDate] = useState("");
  const [today, setToday] = useState("");
  const [booking, setBooking] = useState<{ id?: string; busy?: boolean; error?: string }>({});
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const local = new Date(Date.now() + site.location.utcOffset * 3600000);
    setToday(ymd(local));
  }, []);

  const reservedNights = useMemo(() => (today ? demoReservedNights(today) : new Set<string>()), [today]);

  const nightLabel = useMemo(
    () =>
      selectedDate
        ? new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : "",
    [selectedDate],
  );

  // Night tier (price + moon quality), matched to the calendar dot.
  const night = useMemo(() => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + (24 - site.location.utcOffset) * 3600000;
    const jd = ms / 86400000 + 2440587.5;
    const moon = moonIllumination(jd);
    return { tier: nightTier(moon.fraction), illumPct: Math.round(moon.fraction * 100), phase: moon.phase };
  }, [selectedDate]);

  async function confirmBooking() {
    if (!selectedDate || !night) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setBooking({ busy: true });
    try {
      const id = await createBooking({
        product: "remote",
        date: selectedDate,
        priceUsd: remotePrice(night.tier.price),
        nightTier: night.tier.key,
        moon: { illumPct: night.illumPct, separationDeg: 0, phase: night.phase },
        contact: { email: user.email ?? undefined, name: user.displayName ?? undefined },
      });
      setBooking({ id });
    } catch (e) {
      setBooking({ error: e instanceof Error ? e.message.replace(/^Firebase:\s*/, "") : "Could not save booking" });
    }
  }

  return (
    <Section>
      <Eyebrow>Remote Control · booking</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Reserve a night</h1>
      <p className="mt-4 max-w-2xl text-muted">
        You drive the rig yourself with N.I.N.A. for the whole night, pointing it at any target you like.
        Just pick a clear night and it&apos;s yours, no target selection needed.
      </p>

      {/* 1 · Pick your night */}
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-gold">1 · Pick your night</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Nights are graded by moon darkness. New-moon nights are best for faint targets.
      </p>

      {today && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <div className="w-full max-w-md">
            <NightCalendar
              selected={selectedDate}
              onSelect={(d) => setSelectedDate((cur) => (cur === d ? "" : d))}
              utcOffset={site.location.utcOffset}
              today={today}
              reserved={reservedNights}
            />
          </div>

          {/* Color-coded pricing */}
          <div className="flex w-full flex-col rounded-xl bg-surface p-6 ring-1 ring-hairline sm:w-80">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Price per night</h3>
            <ul className="mt-5 flex-1 divide-y divide-hairline">
              {NIGHT_TIERS.map((t) => {
                const dimmed = night ? t.key !== night.tier.key : false;
                return (
                  <li
                    key={t.key}
                    className={`flex items-center justify-between gap-3 py-3 transition-opacity duration-300 ${
                      dimmed ? "opacity-25" : "opacity-100"
                    }`}
                  >
                    <span className="flex items-center gap-3 text-base text-foreground/90">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
                      {t.key === "dark" ? "Dark (new moon)" : t.label}
                    </span>
                    <span className="text-2xl font-semibold text-gold">{fmtPrice(remotePrice(t.price))}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              Darker (new-moon) nights image fainter targets, so they&apos;re priced highest.
            </p>
          </div>
        </div>
      )}

      {!selectedDate && (
        <p className="mt-8 text-sm text-muted">Pick a night above to reserve your session.</p>
      )}

      {/* 2 · Confirm */}
      {selectedDate && night && (
        <>
          <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-gold">2 · Confirm booking</h2>

          <Card className="mt-4 max-w-3xl">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Your night</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{nightLabel}</p>
                <p className="mt-2 text-sm text-muted">
                  {night.phase} · {night.illumPct}% lit · dusk-to-dawn, the rig is yours
                </p>
              </div>
              <div className="text-right">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ background: `${night.tier.color}22`, color: night.tier.color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: night.tier.color }} />
                  {night.tier.label} night
                </span>
                <p className="mt-1 text-4xl font-semibold leading-none tracking-tight text-gold sm:text-5xl">
                  {fmtPrice(remotePrice(night.tier.price))}
                </p>
                <p className="mt-1 text-xs text-muted">flat, whole night</p>
              </div>
            </div>
          </Card>

          {/* Weather guarantee */}
          <div className="mt-8 flex items-center gap-4 rounded-xl bg-accent/10 p-4 text-accent ring-1 ring-hairline">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path
                d="M7 18a4.5 4.5 0 0 1-.5-8.97 5.5 5.5 0 0 1 10.74-1.06A4 4 0 0 1 17 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12.5 13l-2.2 3.2h2.4L10.8 20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider">Weather guarantee</span>
            <span className="h-9 w-px shrink-0 bg-accent/30" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-accent/90">
              In the event of unsuitable weather conditions, we&apos;ll gladly reschedule your session at no extra
              cost.
            </p>
          </div>

          <div className="mt-6">
            {booking.id ? (
              <div className="rounded-xl bg-emerald-500/10 p-4 ring-1 ring-hairline">
                <p className="text-sm">
                  Remote Control night requested for{" "}
                  <span className="font-semibold text-gold-soft">{nightLabel}</span> ·{" "}
                  <span className="font-semibold text-gold-soft">{fmtPrice(remotePrice(night.tier.price))}</span>. We&apos;ll send
                  your remote-desktop access details.
                </p>
                <Link href="/dashboard" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
                  View in your dashboard →
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={confirmBooking}
                  disabled={booking.busy}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-gold px-6 text-sm font-semibold text-background hover:bg-gold/90 disabled:opacity-50"
                >
                  {booking.busy ? "Saving…" : user ? "Confirm booking →" : "Log in to book →"}
                </button>
                <span className="text-sm text-muted">
                  <span className="font-medium text-gold-soft">{nightLabel}</span> · whole night ·{" "}
                  <span className="font-semibold text-gold">{fmtPrice(remotePrice(night.tier.price))}</span>
                </span>
                {booking.error && <p className="w-full text-sm text-red-300">{booking.error}</p>}
              </div>
            )}
          </div>
        </>
      )}
    </Section>
  );
}
