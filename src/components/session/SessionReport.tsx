import type { ReactNode } from "react";
import Link from "next/link";
import type { SessionReport as SessionReportData } from "@/lib/sessions/report";
import { StatusBadge } from "@/components/StatusBadge";
import { CTA } from "@/components/CTA";
import { AltitudeChart } from "@/components/AltitudeChart";
import { altitudeCurve } from "@/lib/visibility";
import { assessSession } from "@/lib/sessions/assess";
import { site } from "@/config/site";
import { SessionTimeline, HfrChart, OverheadBar, OVERHEAD_COLORS, MoonPhase, GuidingGraph } from "./SessionCharts";
import { HeroImage } from "./HeroImage";

const fmtDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** A headline metric tile. */
function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div className="rounded-[4px] bg-surface-2 p-4 ring-1 ring-hairline">
      <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</div>
      {hint && <div className="mt-1 text-[11px] leading-snug text-muted/80">{hint}</div>}
    </div>
  );
}

/** The "how it went" cards: AI narrative if present, else deterministic flags. */
function howItWentCards(r: SessionReportData): { title: string; body: string }[] {
  if (r.narrative?.howItWent?.length) return r.narrative.howItWent;
  return assessSession(r)
    .slice(0, 3)
    .map((f) => ({ title: f.label, body: f.summary }));
}

/** Mike's first-person recap callout, styled like the blog "Mike's tip". */
function MikeRecap({ text }: { text: string }) {
  return (
    <div className="overflow-hidden rounded-[6px] bg-surface ring-1 ring-accent/25">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/mike.png" alt="Mike" className="mx-auto h-32 w-auto shrink-0 object-contain sm:mx-0 sm:h-40 sm:self-end" />
        <span aria-hidden className="hidden self-stretch border-l border-dotted border-white/20 sm:block" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            ★ Mike’s recap
          </span>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{text}</p>
        </div>
      </div>
    </div>
  );
}

/** Section heading inside the report. */
function Head({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="mb-4 mt-12 flex items-baseline justify-between gap-3 border-b border-hairline pb-2">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{children}</h2>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}

export function SessionReport({ report: r }: { report: SessionReportData }) {
  // Altitude arc for the target on this night (derived from ra/dec + site).
  const curve = altitudeCurve(
    r.target.raDeg,
    r.target.decDeg,
    new Date(`${r.date}T23:30:00${site.location.utcOffset < 0 ? "-" : "+"}${String(Math.abs(site.location.utcOffset)).padStart(2, "0")}:00`),
    site.location,
  );

  return (
    <article className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Your sessions
      </Link>

      {/* Header */}
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{r.target.name}</h1>
            <StatusBadge status={r.status} />
          </div>
          {r.target.catalog && <p className="mt-1 text-sm text-muted">{r.target.catalog}</p>}
          <p className="mt-3 text-sm text-foreground/80">
            Session report · {fmtDate(r.date)} · prepared for {r.client.name}
          </p>
        </div>
        <div className="text-right text-xs text-muted">
          <div>{site.location.observatory}</div>
          <div>Bortle {site.location.bortle} · Rockwood, TX</div>
        </div>
      </header>

      {/* Hero: the field / result */}
      {r.finalImage && (
        <figure className="mt-6 overflow-hidden rounded-[4px] ring-1 ring-hairline">
          <HeroImage src={r.finalImage.src} zoomSrc={r.finalImage.zoomSrc} alt={r.target.name} renders={r.finalImage.renders} />
          {(r.finalImage.caption || r.finalImage.credit) && (
            <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-2 text-xs text-muted">
              <span>{r.finalImage.caption}</span>
              {r.finalImage.credit && <span className="text-muted/70">{r.finalImage.credit}</span>}
            </figcaption>
          )}
        </figure>
      )}

      {/* Delivery banner */}
      <div className="mt-5 rounded-[4px] bg-surface p-4 text-sm ring-1 ring-hairline">
        <p className="text-foreground/90">
          <span className="font-medium text-gold-soft">{r.delivery.lights} light frames</span>
          {r.delivery.calibration && " plus matching calibration frames (darks, flats, bias)"} are ready for download.
          {r.delivery.integratedImage
            ? " A fully integrated image is included."
            : " A fully integrated image is available as an add-on."}
        </p>
      </div>

      {/* How it went — Mike's AI recap + narrative cards, as the intro to the night */}
      <Head>How it went</Head>
      {r.narrative?.mikeRecap && <MikeRecap text={r.narrative.mikeRecap} />}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {howItWentCards(r).map((c, i) => (
          <div key={i} className="rounded-[4px] bg-surface p-4 ring-1 ring-hairline">
            <p className="text-sm font-medium text-foreground">{c.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{c.body}</p>
          </div>
        ))}
      </div>

      {/* Headline stats */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat value={r.capture.integration} label="Integration" hint={`${r.capture.frames} × ${r.capture.subSeconds}s subs`} />
        <Stat value={r.capture.frames} label="Light frames" hint={`${r.capture.filter}`} />
        <Stat value={`${r.conditions.avgHfr.toFixed(2)}px`} label="Avg HFR" hint="focus sharpness — lower is tighter" />
        {r.conditions.avgGuidingRms != null && (
          <Stat value={`${r.conditions.avgGuidingRms.toFixed(2)}"`} label="Guiding RMS" hint="total (RA + Dec), session RMS" />
        )}
        <Stat value={`${r.conditions.yieldPct}%`} label="Yield" hint="of open-sky time spent exposing" />
        <Stat
          value={
            <span className="flex items-center gap-2">
              <MoonPhase illumPct={r.conditions.moon.illumPct} waxing={r.conditions.moon.trend === "up"} />
              {r.conditions.moon.illumPct}% {r.conditions.moon.trend === "down" ? "↓" : "↑"}
            </span>
          }
          label="Moon"
          hint={`${r.conditions.moon.phase} · ${r.conditions.moon.separationDeg}° away`}
        />
      </div>

      {/* The night */}
      <Head note={`${r.sessionStart} → ${r.sessionEnd} · ${r.durationHours}h`}>The night</Head>
      <div className="rounded-[4px] bg-surface p-4 ring-1 ring-hairline">
        <SessionTimeline start={r.sessionStart} end={r.sessionEnd} windows={r.windows} autofocus={r.autofocus} />
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-[2px]" style={{ background: "#6ea8fe" }} /> Imaging window
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden>
              <polygon points="0,0 10,0 5,8" fill="#c4b5fd" />
            </svg>
            Autofocus
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-[4px] bg-surface p-4 ring-1 ring-hairline">
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Target altitude</p>
          <AltitudeChart curve={curve} />
        </div>
        <div className="rounded-[4px] bg-surface p-4 ring-1 ring-hairline">
          <p className="mb-3 text-xs uppercase tracking-wider text-muted">Imaging windows</p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-hairline">
              {r.windows.map((w, i) => (
                <tr key={i}>
                  <td className="py-2 text-foreground/90">{w.start}–{w.end}</td>
                  <td className="py-2 text-right text-muted">{w.frames} frames</td>
                  <td className="py-2 text-right text-foreground/90">{w.integration}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-hairline">
                <td className="pt-2 font-medium text-foreground">Total</td>
                <td className="pt-2 text-right text-muted">{r.capture.frames} frames</td>
                <td className="pt-2 text-right font-medium text-gold-soft">{r.capture.integration}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Framed at {r.target.rotationDeg}° rotation · {r.target.raText} / {r.target.decText}
          </p>
        </div>
      </div>

      {/* Equipment */}
      <Head>Equipment</Head>
      <div className="grid gap-px overflow-hidden rounded-[4px] bg-hairline ring-1 ring-hairline sm:grid-cols-2">
        {r.equipment.map((e) => (
          <div key={e.role} className="bg-surface p-3">
            <div className="text-[11px] uppercase tracking-wider text-muted">{e.role}</div>
            <div className="text-sm text-foreground/90">{e.name}</div>
            {e.detail && <div className="text-xs text-muted/80">{e.detail}</div>}
          </div>
        ))}
      </div>

      {/* Technical deep-dive — always expanded */}
      <Head>Technical deep-dive</Head>
      <div className="rounded-[4px] bg-surface p-4 ring-1 ring-hairline">
          {r.technical.profile && (
            <p className="mb-4 text-xs text-muted">
              {r.technical.profile} · Gain {r.capture.gain} · Offset {r.capture.offset} · Bin {r.capture.binning} · Sensor {r.capture.sensorTempC}°C
            </p>
          )}

          {/* Image quality metrics */}
          <p className="mb-2 text-xs uppercase tracking-wider text-muted">Image quality</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 font-medium">Metric</th>
                  <th className="py-2 text-right font-medium">Min</th>
                  <th className="py-2 text-right font-medium">Max</th>
                  <th className="py-2 text-right font-medium">Mean</th>
                  <th className="py-2 text-right font-medium">CV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {r.technical.metrics.map((m) => (
                  <tr key={m.label}>
                    <td className="py-2 text-foreground/90">{m.label}</td>
                    <td className="py-2 text-right text-muted">{m.min}{m.unit}</td>
                    <td className="py-2 text-right text-muted">{m.max}{m.unit}</td>
                    <td className="py-2 text-right text-foreground/90">{m.mean}{m.unit}</td>
                    <td className="py-2 text-right text-muted">{m.cv}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Guiding (PHD2) — RA/Dec/total RMS + peak, the standard breakdown */}
          {r.technical.guiding && (
            <>
              <p className="mb-2 mt-6 text-xs uppercase tracking-wider text-muted">
                Guiding <span className="normal-case text-muted/70">· PHD2 · {r.technical.guiding.frames.toLocaleString()} frames</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { k: "RA RMS", v: r.technical.guiding.raRmsArcsec },
                  { k: "Dec RMS", v: r.technical.guiding.decRmsArcsec },
                  { k: "Total RMS", v: r.technical.guiding.totalRmsArcsec },
                  { k: "Peak", v: r.technical.guiding.peakArcsec },
                ].map((g) => (
                  <div key={g.k} className="rounded-[4px] bg-surface-2 p-3 ring-1 ring-hairline">
                    <div className="text-lg font-semibold text-foreground">{g.v.toFixed(2)}&quot;</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted">{g.k}</div>
                  </div>
                ))}
              </div>

              {/* Scrollable RA/Dec guiding graph with dithers + photo ticks */}
              {r.technical.guidingTrace && (
                <div className="mt-3">
                  <GuidingGraph
                    points={r.technical.guidingTrace.points}
                    dithers={r.technical.guidingTrace.dithers}
                    photos={r.technical.hfrSeries.map((h) => h.t)}
                    windows={r.windows}
                    sessionStart={r.sessionStart}
                    sessionEnd={r.sessionEnd}
                    rms={r.technical.guiding.totalRmsArcsec}
                  />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: "#6ea8fe" }} /> RA</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: "#f26d6d" }} /> Dec</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed" style={{ borderColor: "#c4b5fd" }} /> Dither</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-0.5" style={{ background: "#f5b34a" }} /> Photo taken</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-4 rounded-[1px]" style={{ background: "rgba(255,255,255,0.08)", borderTop: "1px dashed rgba(255,255,255,0.25)", borderBottom: "1px dashed rgba(255,255,255,0.25)" }} /> ±RMS band</span>
                    <span className="text-muted/60">scroll horizontally →</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* HFR vs time */}
          <p className="mb-2 mt-6 text-xs uppercase tracking-wider text-muted">HFR vs. time</p>
          <HfrChart series={r.technical.hfrSeries} autofocus={r.autofocus} />

          {/* Overhead */}
          <p className="mb-2 mt-6 text-xs uppercase tracking-wider text-muted">
            Imaging overhead · {r.technical.overhead.total} total · {r.technical.overhead.accountedPct}% accounted
          </p>
          <OverheadBar items={r.technical.overhead.items} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 font-medium">Category</th>
                  <th className="py-2 text-right font-medium">Count</th>
                  <th className="py-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {r.technical.overhead.items.map((it, i) => (
                  <tr key={it.label}>
                    <td className="py-2 text-foreground/90">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: OVERHEAD_COLORS[i % OVERHEAD_COLORS.length] }} />
                      {it.label}
                    </td>
                    <td className="py-2 text-right text-muted">{it.count}</td>
                    <td className="py-2 text-right text-foreground/90">{it.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Autofocus runs */}
          <p className="mb-2 mt-6 text-xs uppercase tracking-wider text-muted">Autofocus runs</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-hairline">
                {r.autofocus.map((af, i) => (
                  <tr key={i}>
                    <td className="py-2 text-foreground/90">{af.time}</td>
                    <td className="py-2 text-muted">{af.filter}</td>
                    <td className="py-2 text-right text-muted">{af.tempC}°C</td>
                    <td className="py-2 text-right text-foreground/90">pos {af.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* The rig's session history for this target is intentionally NOT shown:
              it spans all clients, so it could reveal that other people imaged the
              same target. Privacy over completeness. */}
        </div>

      {/* Footer CTA */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6">
        <p className="text-sm text-muted">Want another night on the RedCat 91?</p>
        <CTA href="/book">Book a session</CTA>
      </div>
      <p className="mt-6 text-xs text-muted/70">
        Metrics derived from the on-site N.I.N.A. night log. {site.location.observatory}, Rockwood, TX.
      </p>
    </article>
  );
}
