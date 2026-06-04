"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, Eyebrow, Card } from "@/components/ui";
import { AltitudeChart } from "@/components/AltitudeChart";
import { NightCalendar } from "@/components/NightCalendar";
import { useAuth } from "@/lib/firebase/useAuth";
import { createBooking } from "@/lib/firebase/bookings";
import { skyThumb } from "@/lib/thumbnail";
import { targets, type Target } from "@/data/targets";
import { demoReservedNights } from "@/data/demoReservations";
import { site } from "@/config/site";
import {
  rankTargets,
  altitudeCurve,
  assessConditions,
  imageableWindow,
  moonIllumination,
  type Visibility,
  type Assessment,
  type AltitudeCurve,
} from "@/lib/visibility";
import { nightTier, fmtPrice, NIGHT_TIERS } from "@/lib/pricing";

type Mosaic = { cols: number; rows: number; overlap: number; panels: { ra: number; dec: number }[] };
type Framing = { ra: number; dec: number; rotation: number; targetName: string; image?: string; mosaic?: Mosaic };
type RankedTarget = Target & { visibility: Visibility };
type Win = { start: number; end: number; hours: number } | null;
type Current = {
  name: string;
  ra: number;
  dec: number;
  curve: AltitudeCurve;
  assessment: Assessment;
  window: Win;
};

/** Continuous local hour (17..32) → "HH:MM". */
function fmtHour(h: number) {
  const hh = ((Math.floor(h) % 24) + 24) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function fmtDuration(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m ? ` ${m}m` : ""}`;
}

const ratingStyles: Record<Visibility["rating"], { label: string; cls: string }> = {
  prime: { label: "Prime", cls: "bg-emerald-500/15 text-emerald-300" },
  good: { label: "Good", cls: "bg-accent/15 text-accent" },
  low: { label: "Low / brief", cls: "bg-amber-500/15 text-amber-300" },
  none: { label: "Not up", cls: "bg-surface-2 text-muted" },
};

const qualityStyles: Record<Assessment["rating"], string> = {
  excellent: "bg-emerald-500/15 text-emerald-300",
  good: "bg-accent/15 text-accent",
  fair: "bg-amber-500/15 text-amber-300",
  poor: "bg-red-500/15 text-red-300",
};

const factorDot: Record<"good" | "warn" | "bad", string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-red-400",
};

function ymd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function Book() {
  const [framing, setFraming] = useState<Framing | null>(null);
  const [current, setCurrent] = useState<Current | null>(null);
  const [session, setSession] = useState<{ start: number; end: number } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [today, setToday] = useState("");
  const [aiInfo, setAiInfo] = useState<{
    description?: string;
    constellation?: string | null;
    objectType?: string | null;
    magnitude?: number | null;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [booking, setBooking] = useState<{ id?: string; busy?: boolean; error?: string }>({});
  const [framerUrl, setFramerUrl] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // The desired night as a computation instant (noon UTC keeps the calendar date stable).
  const when = useMemo(() => (selectedDate ? new Date(`${selectedDate}T18:00:00Z`) : null), [selectedDate]);
  const whenRef = useRef<Date | null>(null);
  whenRef.current = when;
  const selRef = useRef<{ name: string; ra: number; dec: number } | null>(null);

  async function continueToCheckout() {
    if (!current || !framing || !session) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setBooking({ busy: true });
    try {
      const a = current.assessment;
      const id = await createBooking({
        targetName: current.name,
        ra: framing.ra,
        dec: framing.dec,
        rotation: framing.rotation,
        previewImage: framing.image,
        mosaic: framing.mosaic ?? null,
        date: selectedDate,
        sessionStart: session.start,
        sessionEnd: session.end,
        durationHours: +(session.end - session.start).toFixed(2),
        priceUsd: tier?.price,
        nightTier: tier?.key,
        maxAltitude: a.maxAltitude,
        darkHours: a.darkHours,
        moon: a.moon
          ? { illumPct: a.moon.illumPct, separationDeg: a.moon.separationDeg, phase: a.moon.phase }
          : null,
        contact: { email: user.email ?? undefined, name: user.displayName ?? undefined },
      });
      setBooking({ id });
    } catch (e) {
      setBooking({ error: e instanceof Error ? e.message.replace(/^Firebase:\s*/, "") : "Could not save booking" });
    }
  }

  // Default to the observatory's current local date.
  useEffect(() => {
    const local = new Date(Date.now() + site.location.utcOffset * 3600000);
    setToday(ymd(local));
    // No date pre-selected — the visitor picks a night from the calendar first.
  }, []);

  const ranked: RankedTarget[] = useMemo(
    () => (when ? rankTargets(targets, when, site.location) : []),
    [when],
  );

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

  // DEMO: nights that are already booked (swap for a real Firestore query later).
  const reservedNights = useMemo(() => (today ? demoReservedNights(today) : new Set<string>()), [today]);

  // Pricing tier of the chosen night — matched to the calendar dot (moon at local midnight).
  const tier = useMemo(() => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + (24 - site.location.utcOffset) * 3600000;
    const jd = ms / 86400000 + 2440587.5;
    return nightTier(moonIllumination(jd).fraction);
  }, [selectedDate]);

  function computeCurrent(name: string, ra: number, dec: number) {
    const w = whenRef.current ?? new Date();
    selRef.current = { name, ra, dec };
    const win = imageableWindow(ra, dec, w, site.location);
    setCurrent({
      name,
      ra,
      dec,
      curve: altitudeCurve(ra, dec, w, site.location),
      assessment: assessConditions(ra, dec, name, w, site.location),
      window: win,
    });
    setSession(win ? { start: win.start, end: win.end } : null);
  }

  // Re-validate the selected target whenever the desired date changes.
  useEffect(() => {
    const s = selRef.current;
    if (!s || !when) return;
    const win = imageableWindow(s.ra, s.dec, when, site.location);
    setCurrent({
      name: s.name,
      ra: s.ra,
      dec: s.dec,
      curve: altitudeCurve(s.ra, s.dec, when, site.location),
      assessment: assessConditions(s.ra, s.dec, s.name, when, site.location),
      window: win,
    });
    setSession(win ? { start: win.start, end: win.end } : null);
  }, [when]);

  // The framing tool posts back the chosen center + rotation.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "scopebnb-framing") {
        const f = { ra: e.data.ra, dec: e.data.dec, rotation: e.data.rotation, targetName: e.data.targetName, image: e.data.image, mosaic: e.data.mosaic };
        setFraming(f);
        computeCurrent(f.targetName, f.ra, f.dec);
        setFramerUrl(null); // close the framing modal
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // computeCurrent reads live refs, so the mount-time closure stays correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openFramer(target: Target) {
    computeCurrent(target.name, target.ra, target.dec);
    setFramerUrl(
      `/framer/index.html?target=${encodeURIComponent(target.name)}&ra=${target.ra}&dec=${target.dec}&date=${selectedDate}`,
    );
  }

  // Fetch an AI-generated description for the current target (any object,
  // catalog or framer-searched). Falls back to curated text if it fails.
  useEffect(() => {
    if (!current) {
      setAiInfo(null);
      return;
    }
    const cat = targets.find((t) => t.name === current.name);
    const ctx = cat ? `${cat.catalog}, a ${cat.type.toLowerCase()} in ${cat.constellation}` : "";
    const ctrl = new AbortController();
    setAiInfo(null);
    setAiLoading(true);
    fetch(`/api/object-info?name=${encodeURIComponent(current.name)}&ctx=${encodeURIComponent(ctx)}`, {
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.description) setAiInfo(d);
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
    return () => ctrl.abort();
  }, [current?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = [
    { n: 1, label: "Pick your night", done: !!selectedDate },
    { n: 2, label: "Choose a target", done: !!current },
    { n: 3, label: "Frame your shot", done: !!framing },
    { n: 4, label: "Night validation", done: !!framing },
    { n: 5, label: "Confirm booking", done: !!booking.id },
  ];
  const activeStep = steps.find((s) => !s.done)?.n ?? 5;

  const visibleCount = ranked.filter((t) => t.visibility.rating !== "none").length;
  const aboutTarget = current ? targets.find((t) => t.name === current.name) ?? null : null;
  const aiDescription = aiInfo?.description ?? aboutTarget?.description ?? null;
  const infoChips: string[] = aboutTarget
    ? [aboutTarget.catalog, aboutTarget.constellation, aboutTarget.type, `mag ${aboutTarget.magnitude}`]
    : ([aiInfo?.constellation, aiInfo?.objectType, aiInfo?.magnitude != null ? `mag ${aiInfo.magnitude}` : null].filter(
        Boolean,
      ) as string[]);

  return (
    <Section>
      <div className="lg:flex lg:gap-12">
        <div className="min-w-0 lg:flex-1">
      <Eyebrow>Managed Imaging · booking</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Book a night</h1>

      {/* 1 · Pick your night */}
      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-gold">1 · Pick your night</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Nights are graded by moon darkness. New-moon nights are best for faint targets.
      </p>
      {today && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <div className="w-full max-w-md">
            <NightCalendar
              selected={selectedDate}
              onSelect={setSelectedDate}
              utcOffset={site.location.utcOffset}
              today={today}
              reserved={reservedNights}
            />
          </div>

          {/* Color-coded pricing — scaled by night darkness */}
          <div className="flex w-full flex-col rounded-xl bg-surface p-6 ring-1 ring-hairline sm:w-80">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Price per night</h3>
            <ul className="mt-5 flex-1 divide-y divide-hairline">
              {NIGHT_TIERS.map((t) => (
                <li key={t.key} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-3 text-base text-foreground/90">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
                    {t.key === "dark" ? "Dark (new moon)" : t.label}
                  </span>
                  <span className="text-2xl font-semibold text-gold">{fmtPrice(t.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              Darker (new-moon) nights image fainter targets, so they&apos;re priced highest.
            </p>
          </div>
        </div>
      )}

      {!selectedDate && (
        <p className="mt-8 text-sm text-muted">
          Pick a night above to see the targets best placed that evening.
        </p>
      )}

      {selectedDate && (
        <>
      {/* 2 · Targets carousel */}
      <div className="mt-12 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">
          2 · Choose a target <span className="font-normal normal-case tracking-normal text-muted">· night of {nightLabel}</span>
        </h2>
        {ranked.length > 0 && <span className="text-xs text-muted">{visibleCount} up this night</span>}
      </div>
      <div className="mt-4 -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 pt-1">
        {ranked.map((t) => {
          const active = current?.name === t.name;
          const v = t.visibility;
          const style = ratingStyles[v.rating];
          const dimmed = v.rating === "none";
          return (
            <div key={t.id} className="w-64 shrink-0 snap-start">
              <Card
                className={`flex h-full flex-col cursor-pointer transition-colors hover:ring-accent/40 ${active ? "ring-2 ring-accent" : ""} ${dimmed ? "opacity-60" : ""}`}
              >
                <div onClick={() => computeCurrent(t.name, t.ra, t.dec)} className="flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={skyThumb(t.ra, t.dec)}
                    alt={t.name}
                    loading="lazy"
                    className="mb-3 aspect-[16/10] w-full rounded-lg bg-surface-2 object-cover ring-1 ring-hairline"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold leading-tight">{t.name}</h3>
                      <p className="mt-1 text-xs text-muted">
                        {t.catalog} · {t.type}
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${style.cls}`}>{style.label}</span>
                  </div>
                  {!dimmed && (
                    <p className="mt-3 text-xs text-muted">
                      Peaks at <span className="text-foreground">{v.maxAltitude}°</span>
                      {v.bestTimeLocal && (
                        <>
                          {" "}around <span className="text-foreground">{v.bestTimeLocal}</span>
                        </>
                      )}{" "}
                      · {v.darkHours}h above 30°
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openFramer(t)}
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-background hover:bg-accent/90"
                >
                  Frame this target →
                </button>
              </Card>
            </div>
          );
        })}
      </div>

      {/* 3 · Your framing — appears only once the framing has been confirmed */}
      {framing && current && (
        <>
          <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-gold">3 · Your framing</h2>
          <Card className="mt-4 max-w-4xl">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Sky preview + coordinates */}
              <div>
                {framing.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={framing.image}
                    alt={`Framing preview for ${current.name}`}
                    className="w-full rounded-lg ring-1 ring-hairline"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-surface-2 p-6 text-center text-xs text-muted ring-1 ring-hairline">
                    Framing saved. Preview unavailable.
                  </div>
                )}
                <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted">RA</dt>
                    <dd className="font-mono">{framing.ra.toFixed(3)}°</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Dec</dt>
                    <dd className="font-mono">{framing.dec.toFixed(3)}°</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Rotation</dt>
                    <dd className="font-mono">{framing.rotation.toFixed(1)}°</dd>
                  </div>
                </dl>
                {framing.mosaic && framing.mosaic.panels.length > 1 && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-xs text-muted">
                    <span className="text-accent">▦</span>
                    {framing.mosaic.cols}×{framing.mosaic.rows} mosaic · {framing.mosaic.panels.length} panels ·{" "}
                    {Math.round(framing.mosaic.overlap * 100)}% overlap
                  </p>
                )}
              </div>

              {/* Educational info (AI-generated, curated fallback) */}
              <div>
                <h3 className="text-xl font-semibold">{current.name}</h3>
                {infoChips.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {infoChips.map((chip) => (
                      <span key={chip} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
                {aiDescription ? (
                  <p className="mt-4 text-sm leading-relaxed text-muted">{aiDescription}</p>
                ) : (
                  <p className="mt-4 text-sm text-muted">
                    {aiLoading ? "Generating a description…" : "No description available for this object."}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* 4 · Night validation — only after the framing is confirmed */}
      {framing && current && (
        <>
          <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-gold">
            4 · Night validation · {current.name}
          </h2>
          <div
            className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl p-4 ring-1 ring-hairline ${current.assessment.visible ? "bg-surface" : "bg-red-500/10"}`}
          >
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${qualityStyles[current.assessment.rating]}`}>
              {current.assessment.rating}
            </span>
            <p className="text-sm">{current.assessment.headline}</p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <Card>
              <AltitudeChart curve={current.curve} selection={session ?? undefined} />
              <p className="mt-2 text-center text-xs text-muted">
                Altitude over the night · shaded band = astronomical darkness · dashed line = 30° usable minimum
              </p>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Conditions</h3>
              <ul className="mt-4 space-y-4">
                {current.assessment.factors.map((f) => (
                  <li key={f.label} className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${factorDot[f.status]}`} />
                    <div>
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted">{f.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Session — we image the whole night the target is up. */}
          {current.window && (
            <Card className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Session</h3>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Imageable tonight</p>
                  <p className="text-4xl font-semibold leading-none tracking-tight text-foreground sm:text-5xl">
                    ~{fmtDuration(current.window.hours)}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Above 30° in darkness from{" "}
                    <span className="font-medium text-foreground">
                      {fmtHour(current.window.start)}–{fmtHour(current.window.end)}
                    </span>
                  </p>
                </div>

                {tier && (
                  <div className="text-right">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ background: `${tier.color}22`, color: tier.color }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tier.color }} />
                      {tier.label} night
                    </span>
                    <p className="mt-1 text-4xl font-semibold leading-none tracking-tight text-gold sm:text-5xl">
                      {fmtPrice(tier.price)}
                    </p>
                    <p className="mt-1 text-xs text-muted">flat, whole night</p>
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm text-muted">
                We image the full window the target stays above 30° in astronomical darkness. Actual integration
                is shorter than the clock time. It depends on several factors:
              </p>
              <ul className="mt-3 space-y-2 pl-5 text-sm text-muted list-disc marker:text-accent">
                <li>Autofocus runs between subs (temperature drift), briefly pausing capture</li>
                <li>Constant dithering: small shifts between subs to suppress noise and walking patterns</li>
                <li>Passing clouds can spoil individual subs, which are discarded</li>
                {framing?.mosaic && framing.mosaic.panels.length > 1 && (
                  <li>Slewing &amp; re-centering the mount between mosaic panels</li>
                )}
              </ul>

              {framing?.mosaic && framing.mosaic.panels.length > 1 && (
                <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/90 ring-1 ring-hairline">
                  <strong className="text-amber-200">
                    {framing.mosaic.panels.length}-panel mosaic · signal-to-noise note.
                  </strong>{" "}
                  A single night&apos;s ~{fmtDuration(current.window.hours)} is split across the panels, so each
                  zone gets only ~{fmtDuration(current.window.hours / framing.mosaic.panels.length)} of integration,
                  roughly √{framing.mosaic.panels.length} (≈{Math.sqrt(framing.mosaic.panels.length).toFixed(1)}×)
                  noisier per zone. To keep single-frame depth, budget ~{framing.mosaic.panels.length}× the time
                  (extra nights).
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Weather guarantee */}
      {framing && current && current.assessment.visible && (
        <div className="mt-8 flex items-start gap-3 rounded-xl bg-accent/10 p-4 text-sm leading-relaxed text-accent ring-1 ring-hairline">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            {/* storm cloud with lightning bolt */}
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
          <p>
            In the event of unsuitable weather conditions, we&apos;ll gladly reschedule your session at no extra
            cost.
          </p>
        </div>
      )}

      {/* 5 · Continue — only after the framing is confirmed and valid for the night */}
      {framing && current && (
        <div className="mt-6">
          {!current.assessment.visible ? (
            <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300 ring-1 ring-hairline">
              {current.name} isn&apos;t imageable on {nightLabel} from this site. Pick another target or date.
            </p>
          ) : booking.id ? (
            <div className="rounded-xl bg-emerald-500/10 p-4 ring-1 ring-hairline">
              <p className="text-sm">
                Booking requested for <span className="font-semibold">{current.name}</span> on{" "}
                <span className="font-semibold text-gold-soft">{nightLabel}</span>
                {session && <> · {fmtHour(session.start)}–{fmtHour(session.end)}</>}
                {tier && <> · <span className="font-semibold text-gold-soft">{fmtPrice(tier.price)}</span></>}. We&apos;ll confirm the night.
              </p>
              <Link href="/dashboard" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
                View in your dashboard →
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={continueToCheckout}
                disabled={booking.busy}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
              >
                {booking.busy ? "Saving…" : user ? "Confirm booking →" : "Log in to book →"}
              </button>
              {session && (
                <span className="text-sm text-muted">
                  <span className="font-medium text-gold-soft">{nightLabel}</span> · {current.name} ·{" "}
                  {fmtHour(session.start)}–{fmtHour(session.end)} · {fmtDuration(session.end - session.start)}
                  {tier && <> · <span className="font-semibold text-gold">{fmtPrice(tier.price)}</span></>}
                </span>
              )}
              {booking.error && <p className="w-full text-sm text-red-300">{booking.error}</p>}
            </div>
          )}
        </div>
      )}
        </>
      )}
        </div>

        {/* Progress tracker — sticky on the right so it stays as you advance */}
        <aside className="mt-10 hidden shrink-0 lg:mt-0 lg:block lg:w-52">
          <div className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Step {activeStep} of {steps.length}
            </p>
            <ol className="mt-4 space-y-1">
              {steps.map((s) => {
                const active = s.n === activeStep;
                return (
                  <li
                    key={s.n}
                    className={`flex items-center gap-3 rounded-lg px-2 py-2 ${active ? "bg-surface" : ""}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        s.done
                          ? "bg-gold text-background"
                          : active
                            ? "text-gold ring-2 ring-gold"
                            : "bg-surface-2 text-muted"
                      }`}
                    >
                      {s.done ? "✓" : s.n}
                    </span>
                    <span
                      className={`text-sm ${active ? "font-medium text-foreground" : s.done ? "text-foreground/80" : "text-muted"}`}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>

      {/* Framing tool — embedded in a modal (no popup) */}
      {framerUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 sm:p-6"
          onClick={() => setFramerUrl(null)}
        >
          <div
            className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-background ring-1 ring-hairline"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-gold">Frame your shot</span>
              <button
                type="button"
                onClick={() => setFramerUrl(null)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <iframe src={framerUrl} title="ScopeBnB framing tool" className="w-full flex-1 border-0" />
          </div>
        </div>
      )}
    </Section>
  );
}
