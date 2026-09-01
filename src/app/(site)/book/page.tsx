"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, Eyebrow, Card } from "@/components/ui";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { AltitudeChart } from "@/components/AltitudeChart";
import { NightCalendar } from "@/components/NightCalendar";
import { useAuth } from "@/lib/firebase/useAuth";
import { createBooking } from "@/lib/firebase/bookings";
import { trackEvent } from "@/lib/analytics";
import { skyThumb } from "@/lib/thumbnail";
import { astrobinUrl } from "@/lib/astrobin";
import { targets, type Target } from "@/data/targets";
import { captureFilters } from "@/data/equipment";
import type { CaptureFilterPlan } from "@/lib/bookings/types";
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
import { nightTier, fmtPrice, remotePrice, NIGHT_TIERS, INTEGRATION_FEE } from "@/lib/pricing";

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
  const [mode, setMode] = useState<"managed" | "remote" | null>(null);
  const [framing, setFraming] = useState<Framing | null>(null);
  const [framingName, setFramingName] = useState(""); // user-editable label for the saved framing
  const [zoomed, setZoomed] = useState(false); // framing preview open in a full-size lightbox
  const [current, setCurrent] = useState<Current | null>(null);
  const [session, setSession] = useState<{ start: number; end: number } | null>(null);
  // Managed capture plan: per-filter sub targets (seeded from the rig's filters) + team notes.
  const [plan, setPlan] = useState<CaptureFilterPlan[]>(() =>
    captureFilters.map((f) => ({ key: f.key, enabled: true, subSeconds: f.defaultSub, subs: f.defaultSubs })),
  );
  const [captureNotes, setCaptureNotes] = useState("");
  // Add-on: deliver a fully integrated image (+$25) on top of lights + calibration.
  const [wantsIntegration, setWantsIntegration] = useState(false);
  const updatePlan = (key: string, patch: Partial<CaptureFilterPlan>) =>
    setPlan((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  // Capture plan is an advanced, opt-in setting: collapsed by default, in which
  // case the ScopeBnB team chooses the filters/exposures. Opening it reveals the
  // controls and triggers the AI seed.
  const [planOpen, setPlanOpen] = useState(false);
  // AI-suggested plan: seeds the controls the first time the panel is opened.
  const [planAi, setPlanAi] = useState<{ rationale: string; loading: boolean }>({ rationale: "", loading: false });
  const suggestedForRef = useRef<string | null>(null);
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
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollCarousel = (dir: 1 | -1) =>
    carouselRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

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
        targetName: framingName.trim() || current.name,
        ra: framing.ra,
        dec: framing.dec,
        rotation: framing.rotation,
        previewImage: framing.image,
        mosaic: framing.mosaic ?? null,
        capturePlan: { filters: plan, notes: captureNotes.trim() || undefined, autoManaged: !planOpen },
        wantsIntegration,
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
      // Marketing conversion: a managed booking request, with its value.
      trackEvent("generate_lead", {
        currency: "USD",
        value: managedTotal,
        mode: "managed",
        night_tier: tier?.key,
        wants_integration: wantsIntegration,
      });
    } catch (e) {
      setBooking({ error: e instanceof Error ? e.message.replace(/^Firebase:\s*/, "") : "Could not save booking" });
    }
  }

  // Remote Control: the rig is yours for the whole night, no target/framing needed.
  async function confirmRemote() {
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
      // Marketing conversion: a remote-control booking request, with its value.
      trackEvent("generate_lead", {
        currency: "USD",
        value: remotePrice(night.tier.price),
        mode: "remote",
        night_tier: night.tier.key,
      });
    } catch (e) {
      setBooking({ error: e instanceof Error ? e.message.replace(/^Firebase:\s*/, "") : "Could not save booking" });
    }
  }

  // Default to the observatory's current local date.
  useEffect(() => {
    const local = new Date(Date.now() + site.location.utcOffset * 3600000);
    setToday(ymd(local));
    // No date pre-selected — the visitor picks a night from the calendar first.
    // Deep-link support: /book?mode=managed|remote preselects the modality.
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "managed" || m === "remote") setMode(m);
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

  // Unavailable nights from the server: real bookings + admin-blocked nights.
  const [reservedNights, setReservedNights] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then((d) => setReservedNights(new Set<string>(d.unavailable ?? [])))
      .catch(() => {});
  }, []);

  // The chosen night's moon — pricing tier + illumination, matched to the calendar dot (moon at local midnight).
  const night = useMemo(() => {
    if (!selectedDate) return null;
    const [y, m, d] = selectedDate.split("-").map(Number);
    const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + (24 - site.location.utcOffset) * 3600000;
    const jd = ms / 86400000 + 2440587.5;
    const moon = moonIllumination(jd);
    return { tier: nightTier(moon.fraction), illumPct: Math.round(moon.fraction * 100), phase: moon.phase };
  }, [selectedDate]);
  const tier = night?.tier ?? null;
  // Remote nights cost 10% more than managed — the price shown follows the chosen modality.
  const priceOf = (base: number) => (mode === "remote" ? remotePrice(base) : base);
  // Managed total = night price + optional integrated-image add-on.
  const managedTotal = tier ? tier.price + (wantsIntegration ? INTEGRATION_FEE : 0) : 0;

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
        setFramingName(f.targetName); // default label = object name, user can rename
        computeCurrent(f.targetName, f.ra, f.dec);
        setFramerUrl(null); // close the framing modal
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // computeCurrent reads live refs, so the mount-time closure stays correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selecting a target different from the one already framed invalidates that
  // framing, so the framing card and validation never desync from the target.
  function selectTarget(name: string, ra: number, dec: number) {
    if (framing && framing.targetName !== name) {
      setFraming(null);
      setFramingName("");
    }
    computeCurrent(name, ra, dec);
  }

  function openFramer(target: Target) {
    selectTarget(target.name, target.ra, target.dec);
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

  // When the user opens the advanced panel for a framed target, ask the AI to
  // seed the plan. Re-runs only when the target or night changes (or it's first
  // opened), so manual edits are kept.
  useEffect(() => {
    if (!planOpen || !framing || !current?.assessment.visible) return;
    const key = `${current.name}|${selectedDate}`;
    if (suggestedForRef.current === key) return;
    suggestedForRef.current = key;

    const cat = targets.find((t) => t.name === current.name);
    const qs = new URLSearchParams({
      name: current.name,
      type: cat?.type ?? "",
      mag: cat?.magnitude != null ? String(cat.magnitude) : "",
      moon: String(Math.round(current.assessment.moon?.illumPct ?? 0)),
      window: String(current.window?.hours ?? 0),
    });
    const ctrl = new AbortController();
    setPlanAi({ rationale: "", loading: true });
    fetch(`/api/capture-plan?${qs.toString()}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !Array.isArray(d.filters)) {
          setPlanAi({ rationale: "", loading: false });
          return;
        }
        setPlan((prev) =>
          prev.map((p) => {
            const s = d.filters.find((f: { key: string }) => f.key === p.key);
            return s ? { key: p.key, enabled: !!s.enabled, subSeconds: s.subSeconds, subs: s.subs } : p;
          }),
        );
        setPlanAi({ rationale: typeof d.rationale === "string" ? d.rationale : "", loading: false });
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setPlanAi({ rationale: "", loading: false });
      });
    return () => ctrl.abort();
  }, [planOpen, framing?.targetName, current?.name, current?.assessment.visible, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Steps depend on the chosen modality: managed frames a target; remote jumps to confirm.
  const steps =
    mode === "remote"
      ? [
          { n: 1, label: "How you'll shoot", done: !!mode, anchor: "step-mode", reachable: true },
          { n: 2, label: "Pick your night", done: !!selectedDate, anchor: "step-night", reachable: !!mode },
          { n: 3, label: "Confirm booking", done: !!booking.id, anchor: "step-confirm", reachable: !!selectedDate },
        ]
      : [
          { n: 1, label: "How you'll shoot", done: !!mode, anchor: "step-mode", reachable: true },
          { n: 2, label: "Pick your night", done: !!selectedDate, anchor: "step-night", reachable: !!mode },
          { n: 3, label: "Choose a target", done: !!framing, anchor: "step-target", reachable: !!selectedDate },
          { n: 4, label: "Confirm booking", done: !!booking.id, anchor: "step-confirm", reachable: !!framing },
        ];
  const activeStep = steps.find((s) => !s.done)?.n ?? steps.length;
  const goToStep = (anchor: string) =>
    document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });

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
      <Eyebrow>Booking</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Book a night</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        One rig, two ways to shoot it. Start by choosing how you want to work tonight.
      </p>

      {/* 1 · How you'll shoot it */}
      <h2 id="step-mode" className="mt-8 scroll-mt-24 text-sm font-semibold uppercase tracking-wider text-gold">
        1 · How you&apos;ll shoot it
      </h2>
      <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
        {([
          {
            key: "managed",
            title: "Request an image",
            tag: "Managed",
            desc: "We frame and capture it for you. You get the session's lights plus calibration frames within 24h, ready to stack. No remote-control skills needed.",
          },
          {
            key: "remote",
            title: "Take control",
            tag: "Remote · N.I.N.A.",
            desc: "Rent the rig and drive it yourself for the whole night, pointing it at any target you like.",
          },
        ] as const).map((m) => {
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`flex h-full flex-col rounded-[4px] bg-surface p-6 text-left transition-colors ${
                active ? "ring-2 ring-accent" : "ring-1 ring-hairline hover:bg-surface-2"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">{m.tag}</span>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{m.title}</h3>
              <p className="mt-3 flex-1 text-sm text-muted">{m.desc}</p>
              <span className={`mt-5 text-sm font-semibold ${active ? "text-accent" : "text-muted"}`}>
                {active ? "Selected ✓" : "Choose →"}
              </span>
            </button>
          );
        })}
      </div>

      {mode && (
        <>
      {/* 2 · Pick your night */}
      <h2 id="step-night" className="mt-12 scroll-mt-24 text-sm font-semibold uppercase tracking-wider text-gold">
        2 · Pick your night
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Nights are graded by moon darkness. New-moon nights are best for faint targets.
      </p>
      {today && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <div className="w-full max-w-md">
            <NightCalendar
              selected={selectedDate}
              onSelect={(ymd) => setSelectedDate((d) => (d === ymd ? "" : ymd))}
              utcOffset={site.location.utcOffset}
              today={today}
              reserved={reservedNights}
            />
          </div>

          {/* Right column: sky-forecast shortcut + color-coded pricing */}
          <div className="flex w-full flex-col gap-4 sm:w-80">
            <Link
              href="/forecast"
              className="flex items-center justify-between gap-2 rounded-[4px] bg-surface px-5 py-3.5 ring-1 ring-hairline transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                >
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                </svg>
                Check the sky forecast
              </span>
              <span className="text-accent">→</span>
            </Link>

            <div className="flex w-full flex-1 flex-col rounded-[4px] bg-surface p-6 ring-1 ring-hairline">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Price per night</h3>
            <ul className="mt-5 flex-1 divide-y divide-hairline">
              {NIGHT_TIERS.map((t) => {
                const dimmed = tier ? t.key !== tier.key : false;
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
                    <span className="text-2xl font-semibold text-gold">{fmtPrice(priceOf(t.price))}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              Darker (new-moon) nights image fainter targets, so they&apos;re priced highest.
            </p>
            </div>
          </div>
        </div>
      )}

      {!selectedDate && (
        <p className="mt-8 text-sm text-muted">
          {mode === "remote"
            ? "Pick a night above to reserve the rig for the evening."
            : "Pick a night above to see the targets best placed that evening."}
        </p>
      )}

      {mode === "managed" && selectedDate && (
        <>
      {/* 3 · Targets carousel */}
      <div className="mt-12 flex items-baseline justify-between">
        <h2 id="step-target" className="scroll-mt-24 text-sm font-semibold uppercase tracking-wider text-gold">
          3 · Choose a target <span className="font-normal normal-case tracking-normal text-muted">· night of {nightLabel}</span>
        </h2>
        <div className="flex items-center gap-3">
          {ranked.length > 0 && <span className="text-xs text-muted">{visibleCount} up this night</span>}
          {ranked.length > 1 && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                aria-label="Previous targets"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted ring-1 ring-hairline hover:bg-surface-2 hover:text-foreground"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                aria-label="More targets"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted ring-1 ring-hairline hover:bg-surface-2 hover:text-foreground"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
      <div
        ref={carouselRef}
        className="mt-4 -mx-2 flex snap-x scroll-pl-2 gap-4 overflow-x-auto px-2 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
                <div onClick={() => selectTarget(t.name, t.ra, t.dec)} className="flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={skyThumb(t.ra, t.dec)}
                    alt={t.name}
                    loading="lazy"
                    className="mb-3 aspect-[16/10] w-full rounded-[4px] bg-surface-2 object-cover ring-1 ring-hairline"
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
                <a
                  href={astrobinUrl(t.catalog)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 inline-flex w-fit items-center gap-1 text-xs text-muted hover:text-accent"
                >
                  See {t.catalog} on AstroBin ↗
                </a>
                <button
                  type="button"
                  onClick={() => openFramer(t)}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-[4px] border border-accent/40 bg-transparent px-4 text-sm font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/10"
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
          <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-muted">Your framing</h2>
          <Card className="mt-4 max-w-4xl">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Sky preview + coordinates */}
              <div>
                {framing.image ? (
                  <button
                    type="button"
                    onClick={() => setZoomed(true)}
                    className="group block w-full cursor-zoom-in overflow-hidden rounded-[4px] ring-1 ring-hairline"
                    aria-label="View framing preview full size"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={framing.image}
                      alt={`Framing preview for ${current.name}`}
                      className="w-full transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </button>
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center rounded-[4px] bg-surface-2 p-6 text-center text-xs text-muted ring-1 ring-hairline">
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

              {/* Editable framing name + educational info (AI-generated, curated fallback) */}
              <div>
                <label htmlFor="framing-name" className="text-[11px] uppercase tracking-wider text-muted">
                  Framing name
                </label>
                <div className="group relative mt-1 -mx-1">
                  <input
                    id="framing-name"
                    value={framingName}
                    onChange={(e) => setFramingName(e.target.value)}
                    placeholder={current.name}
                    maxLength={60}
                    className="w-full rounded-md bg-transparent py-0.5 pl-1 pr-8 text-xl font-semibold text-foreground outline-none ring-1 ring-transparent transition hover:ring-hairline focus:ring-gold"
                  />
                  {/* pencil — signals the name is editable */}
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-gold"
                  >
                    <path
                      d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
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
                <a
                  href={astrobinUrl(aboutTarget?.catalog ?? current.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  See real captures on AstroBin ↗
                </a>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* 4 · Night validation — only after the framing is confirmed */}
      {framing && current && (
        <>
          <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-muted">
            Night validation · {current.name}
          </h2>
          <div
            className={`mt-4 flex flex-wrap items-center gap-3 rounded-[4px] p-4 ring-1 ring-hairline ${current.assessment.visible ? "bg-surface" : "bg-red-500/10"}`}
          >
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${qualityStyles[current.assessment.rating]}`}>
              {current.assessment.rating}
            </span>
            <p className="text-sm">
              {current.assessment.headline.replace(/\btonight\b/i, `on ${nightLabel}`)}
            </p>
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
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
                Session <span className="font-normal normal-case tracking-normal">· {nightLabel}</span>
              </h3>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
                <div>
                  <p className="text-4xl font-semibold leading-none tracking-tight text-gold-soft sm:text-5xl">
                    ~{fmtDuration(current.window.hours)}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-muted">Imageable this night</p>
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

              {/* Night timeline — where the imageable window falls between dusk and dawn. */}
              {(() => {
                const c = current.curve;
                const span = c.endHour - c.startHour || 1;
                const pct = (h: number) => ((h - c.startHour) / span) * 100;
                const w = current.window!;
                return (
                  <div className="mt-6">
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-2">
                      {c.darkStart != null && c.darkEnd != null && (
                        <div
                          className="absolute inset-y-0 bg-accent/20"
                          style={{ left: `${pct(c.darkStart)}%`, width: `${pct(c.darkEnd) - pct(c.darkStart)}%` }}
                        />
                      )}
                      <div
                        className="absolute inset-y-0 rounded-full bg-gold"
                        style={{ left: `${pct(w.start)}%`, width: `${pct(w.end) - pct(w.start)}%` }}
                      />
                      <div className="absolute inset-y-0 w-px bg-white/15" style={{ left: `${pct(24)}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                      <span>Dusk</span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <span className="h-1.5 w-3 rounded-full bg-gold" />
                        {fmtHour(w.start)}–{fmtHour(w.end)} above 30° in darkness
                      </span>
                      <span>Dawn</span>
                    </div>
                  </div>
                );
              })()}

              <p className="mt-5 text-sm text-muted">
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
                <div className="mt-4 rounded-[4px] bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200/90 ring-1 ring-hairline">
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

          {/* Capture plan — how the night is split between the rig's two filter states */}
          {current.assessment.visible && (
            <Card className="mt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Capture plan</h3>
                  <p className="mt-2 max-w-xl text-sm text-muted">
                    {planOpen
                      ? "One-shot colour rig, so it's clear glass or the L-Extreme narrowband. Counts are a target — we image the whole window above and split it as you set here."
                      : "By default our team picks the best filters and sub-exposures for your target and the night's conditions. You can set your own plan if you'd like."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPlanOpen((o) => !o)}
                  aria-expanded={planOpen}
                  className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/40 transition-colors hover:bg-accent/10"
                >
                  {planOpen ? "Use ScopeBnB's choice" : "Customise"}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`transition-transform ${planOpen ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {!planOpen && (
                <div className="mt-4 flex items-start gap-2 rounded-[4px] bg-surface px-4 py-3 text-xs text-muted ring-1 ring-hairline">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-accent">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span>
                    We&apos;ll choose the filters and sub-exposures that get the most out of{" "}
                    {framingName.trim() || current.name} on {nightLabel}. Leave a note below if you have preferences.
                  </span>
                </div>
              )}

              {planOpen && (
                <>
              {(planAi.loading || planAi.rationale) && (
                <div className="mt-3 flex items-start gap-2 rounded-[4px] bg-accent/10 px-3 py-2 text-xs text-accent ring-1 ring-hairline">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
                    <path
                      d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM18 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="text-accent/90">
                    {planAi.loading ? (
                      "Suggesting a starting plan for this target and night…"
                    ) : (
                      <>
                        <span className="font-semibold text-accent">AI suggestion · </span>
                        {planAi.rationale} Adjust anything below.
                      </>
                    )}
                  </span>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {captureFilters.map((def) => {
                  const p = plan.find((x) => x.key === def.key)!;
                  const hrs = (p.subSeconds * p.subs) / 3600;
                  const accentText = def.accent === "gold" ? "text-gold-soft" : "text-accent";
                  return (
                    <div
                      key={def.key}
                      className={`rounded-[4px] bg-surface p-4 ring-1 transition-opacity ${
                        p.enabled ? "ring-gold/40" : "opacity-50 ring-hairline"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={p.enabled}
                          aria-label={`Use ${def.name}`}
                          onClick={() => updatePlan(def.key, { enabled: !p.enabled })}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] ${
                            p.enabled ? "bg-gold text-background" : "text-transparent ring-1 ring-white/20"
                          }`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 12l4.5 4.5L19 7"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-medium">{def.name}</span>
                            <span className={`text-xs ${accentText}`}>{def.tagline}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted">{def.blurb}</p>

                          {p.enabled && (
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                              <label className="text-xs text-muted">
                                Sub length{" "}
                                <select
                                  value={p.subSeconds}
                                  onChange={(e) => updatePlan(def.key, { subSeconds: Number(e.target.value) })}
                                  className="ml-1 rounded-[4px] bg-surface-2 px-2 py-1 text-xs text-foreground"
                                >
                                  {def.subOptions.map((s) => (
                                    <option key={s} value={s}>
                                      {s}s
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-xs text-muted">
                                Desired subs{" "}
                                <input
                                  type="number"
                                  min={0}
                                  value={p.subs}
                                  onChange={(e) =>
                                    updatePlan(def.key, { subs: Math.max(0, Number(e.target.value) || 0) })
                                  }
                                  className="ml-1 w-16 rounded-[4px] bg-surface-2 px-2 py-1 text-xs text-foreground"
                                />
                              </label>
                              <span className="ml-auto text-xs text-gold-soft">≈ {fmtDuration(hrs)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const requested = plan.reduce(
                  (sum, p) => sum + (p.enabled ? (p.subSeconds * p.subs) / 3600 : 0),
                  0,
                );
                const avail = current.window?.hours;
                const over = avail != null && requested > avail + 0.01;
                return (
                  <>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-[4px] bg-surface-2 px-4 py-3">
                      <span className="text-xs uppercase tracking-wider text-muted">Requested integration</span>
                      <span className="text-sm">
                        <span className={`font-semibold ${over ? "text-amber-300" : "text-gold"}`}>
                          {fmtDuration(requested)}
                        </span>
                        {avail != null && (
                          <span className="text-muted"> of ~{fmtDuration(avail)} imageable this night</span>
                        )}
                      </span>
                    </div>
                    {over && (
                      <p className="mt-2 text-xs text-amber-200/90">
                        That&apos;s more than fits in one night — we&apos;ll prioritise by your notes, or it may need
                        extra nights.
                      </p>
                    )}
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-accent">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <span>
                        These counts are an ideal target. Real integration depends on conditions on the night —
                        weather, when the roof can open, seeing, and passing clouds. We capture as much as the
                        window allows and never charge for clouded-out time.
                      </span>
                    </p>
                  </>
                );
              })()}
                </>
              )}

              <div className="mt-5">
                <label htmlFor="capture-notes" className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Notes for the team
                </label>
                <textarea
                  id="capture-notes"
                  maxLength={500}
                  value={captureNotes}
                  onChange={(e) => setCaptureNotes(e.target.value)}
                  placeholder="e.g. Prioritise OIII on the core, skip if seeing is poor..."
                  className="mt-2 min-h-[84px] w-full resize-y rounded-[4px] bg-surface px-3 py-2 text-sm text-foreground ring-1 ring-hairline placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
                <div className="mt-1 text-right text-xs text-muted">{captureNotes.length}/500</div>
              </div>
            </Card>
          )}

          {/* Deliverable — what you receive, plus the optional integrated-image add-on */}
          {current.assessment.visible && (
            <Card className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">What you&apos;ll receive</h3>
              <p className="mt-2 text-sm text-muted">
                Every managed night ships the complete set of light frames from your session plus the matching
                calibration frames (darks and flats), ready for you to stack. Calibrated 16-bit FITS, delivered to
                your dashboard within 24h.
              </p>

              <button
                type="button"
                role="checkbox"
                aria-checked={wantsIntegration}
                onClick={() => setWantsIntegration((v) => !v)}
                className={`mt-4 flex w-full items-start gap-3 rounded-[4px] p-4 text-left ring-1 transition-colors ${
                  wantsIntegration ? "bg-gold/10 ring-gold/40" : "bg-surface ring-hairline hover:ring-accent/40"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] ${
                    wantsIntegration ? "bg-gold text-background" : "text-transparent ring-1 ring-white/20"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">Add a finished, integrated image</span>
                    <span className="text-sm font-semibold text-gold">+{fmtPrice(INTEGRATION_FEE)}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    We calibrate, stack and process your data into a ready-to-stretch image. Otherwise you do it
                    yourself with the frames above.
                  </span>
                </span>
              </button>
            </Card>
          )}
        </>
      )}

      {/* Weather guarantee */}
      {framing && current && current.assessment.visible && (
        <div className="mt-8 flex items-center gap-4 rounded-[4px] bg-accent/10 p-4 text-accent ring-1 ring-hairline">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="shrink-0">
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
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider">Weather guarantee</span>
          <span className="h-9 w-px shrink-0 bg-accent/30" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-accent/90">
            In the event of unsuitable weather conditions, we&apos;ll gladly reschedule your session at no extra
            cost.
          </p>
        </div>
      )}

      {/* 3 · Confirm booking — only after the framing is confirmed and valid for the night */}
      {framing && current && (
        <div className="mt-12">
          {current.assessment.visible && (
            <h2 id="step-confirm" className="mb-4 scroll-mt-24 text-sm font-semibold uppercase tracking-wider text-gold">
              4 · Confirm booking
            </h2>
          )}
          {!current.assessment.visible ? (
            <p className="rounded-[4px] bg-red-500/10 p-4 text-sm text-red-300 ring-1 ring-hairline">
              {current.name} isn&apos;t imageable on {nightLabel} from this site. Pick another target or date.
            </p>
          ) : booking.id ? (
            <div className="rounded-[4px] bg-emerald-500/10 p-4 ring-1 ring-hairline">
              <p className="text-sm">
                Booking requested for <span className="font-semibold">{framingName.trim() || current.name}</span> on{" "}
                <span className="font-semibold text-gold-soft">{nightLabel}</span>
                {session && <> · {fmtHour(session.start)}–{fmtHour(session.end)}</>}
                {tier && <> · <span className="font-semibold text-gold-soft">{fmtPrice(managedTotal)}</span></>}
                {wantsIntegration && <span className="text-muted"> (incl. integrated image)</span>}. We&apos;ll confirm the night.
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
                className="inline-flex h-11 items-center justify-center rounded-[4px] bg-gold px-6 text-sm font-semibold text-background hover:bg-gold/90 disabled:opacity-50"
              >
                {booking.busy ? "Saving…" : user ? "Confirm booking →" : "Log in to book →"}
              </button>
              {session && (
                <span className="text-sm text-muted">
                  <span className="font-medium text-gold-soft">{nightLabel}</span> · {framingName.trim() || current.name} ·{" "}
                  {fmtHour(session.start)}–{fmtHour(session.end)} · {fmtDuration(session.end - session.start)}
                  {tier && (
                    <>
                      {" "}· <span className="font-semibold text-gold">{fmtPrice(managedTotal)}</span>
                      {wantsIntegration && (
                        <span className="text-muted">
                          {" "}({fmtPrice(tier.price)} night + {fmtPrice(INTEGRATION_FEE)} integration)
                        </span>
                      )}
                    </>
                  )}
                </span>
              )}
              {booking.error && <p className="w-full text-sm text-red-300">{booking.error}</p>}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* 3 · Confirm booking (Remote) — the whole night is yours, no target/framing */}
      {mode === "remote" && selectedDate && night && (
        <>
          <h2 id="step-confirm" className="mt-12 scroll-mt-24 text-sm font-semibold uppercase tracking-wider text-gold">
            3 · Confirm booking
          </h2>

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
            <p className="mt-5 text-sm text-muted">
              You drive the rig yourself with N.I.N.A. for the whole night, and point it at any target you like. No
              target selection or framing needed here.
            </p>
          </Card>

          {/* Weather guarantee */}
          <div className="mt-8 flex items-center gap-4 rounded-[4px] bg-accent/10 p-4 text-accent ring-1 ring-hairline">
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
              <div className="rounded-[4px] bg-emerald-500/10 p-4 ring-1 ring-hairline">
                <p className="text-sm">
                  Remote Control night requested for{" "}
                  <span className="font-semibold text-gold-soft">{nightLabel}</span> ·{" "}
                  <span className="font-semibold text-gold-soft">{fmtPrice(remotePrice(night.tier.price))}</span>.
                  We&apos;ll send your remote-desktop access details.
                </p>
                <Link href="/dashboard" className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
                  View in your dashboard →
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={confirmRemote}
                  disabled={booking.busy}
                  className="inline-flex h-11 items-center justify-center rounded-[4px] bg-gold px-6 text-sm font-semibold text-background hover:bg-gold/90 disabled:opacity-50"
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
                const reachable = s.reachable;
                return (
                  <li key={s.n}>
                    <button
                      type="button"
                      onClick={() => goToStep(s.anchor)}
                      disabled={!reachable}
                      className={`flex w-full items-center gap-3 rounded-[4px] px-2 py-2 text-left transition-colors ${
                        active ? "bg-surface" : reachable ? "hover:bg-surface/60" : ""
                      }`}
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
                    </button>
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
            className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[4px] bg-background ring-1 ring-hairline"
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

      {/* Newsletter promo — nudge the 10% first-session discount while booking. */}
      <div className="mt-12">
        <NewsletterSignup source="book" variant="compact" />
      </div>

      {/* Framing preview lightbox — full-size view of the captured framing. */}
      {zoomed && framing?.image && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 sm:p-8"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={framing.image}
            alt={`Framing preview for ${current?.name ?? "target"}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-zoom-out rounded-[4px] ring-1 ring-white/10"
          />
        </div>
      )}
    </Section>
  );
}
