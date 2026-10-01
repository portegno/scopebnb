import type { Metadata } from "next";
import Link from "next/link";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { NIGHT_TIERS, fmtPrice, INTEGRATION_FEE, REMOTE_PLANS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Managed imaging from $65 to $100 per night by sky darkness, remote control by the block ($150 for 3 nights or $300 for a full week of 7), and a $25 integrated-image add-on. No subscription.",
  alternates: { canonical: "/pricing" },
};

function TierTable() {
  return (
    <ul className="mt-5 divide-y divide-hairline">
      {NIGHT_TIERS.map((t) => (
        <li key={t.key} className="flex items-center justify-between gap-3 py-3">
          <span className="flex items-center gap-3 text-sm text-foreground/90">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
            {t.key === "dark" ? "Dark (new moon)" : t.label}
          </span>
          <span className="text-xl font-semibold text-gold">{fmtPrice(t.price)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Pricing() {
  return (
    <Section>
      <Eyebrow>Pricing</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Simple rates, no hidden fees</h1>
      <p className="mt-4 max-w-2xl text-muted">
        No subscription, you only pay when you book. Managed imaging is priced by how dark the night is: new-moon
        nights image the faintest targets, so they cost the most. Remote control is a flat rate for a block of nights.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Managed Imaging */}
        <Card className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Managed Imaging</p>
          <h2 className="mt-1 text-lg font-semibold">We capture, you receive the data</h2>
          <p className="mt-1 text-sm text-muted">
            Pick a target, frame it, and our team runs the rig. You receive the session&apos;s light frames plus
            the matching calibration frames within 24h, ready to stack.
          </p>
          <TierTable />
          <p className="mt-4 text-xs text-muted">Flat price for the whole imageable night.</p>
          <div className="mt-5 flex items-start justify-between gap-3 rounded-[4px] bg-surface-2 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground/90">Integrated image add-on</p>
              <p className="mt-0.5 text-xs text-muted">
                Want a finished picture instead of the raw data? We calibrate, stack and process it for you.
              </p>
            </div>
            <span className="shrink-0 text-lg font-semibold text-gold">+{fmtPrice(INTEGRATION_FEE)}</span>
          </div>
          <div className="mt-6">
            <CTA href="/book?mode=managed">Book a night</CTA>
          </div>
        </Card>

        {/* Remote Control */}
        <Card className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Remote Control (NINA)</p>
          <h2 className="mt-1 text-lg font-semibold">You drive the rig yourself</h2>
          <p className="mt-1 text-sm text-muted">
            Rent the telescope and operate it remotely with N.I.N.A., pointing it at anything you like. Sold by the
            block of consecutive nights, one flat rate, no matter the moon.
          </p>

          <div className="mt-4 flex-1 space-y-3">
            {REMOTE_PLANS.map((p) => (
              <Link
                key={p.key}
                href={`/book?mode=remote&plan=${p.key}`}
                className={`group block rounded-[4px] p-4 transition-colors ${
                  p.popular
                    ? "bg-surface-2 ring-1 ring-gold/40 hover:ring-gold/70"
                    : "bg-surface-2/60 ring-1 ring-hairline hover:ring-accent/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {p.popular ? (
                    <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background">
                      Most popular
                    </span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">Shorter run</span>
                  )}
                  <span className="text-2xl font-semibold text-gold">{fmtPrice(p.price)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {p.popular ? "Full week" : `${p.nights}-night block`} · {p.nights} nights in a row
                </p>
                <p className="mt-1 text-xs text-muted">
                  ≈ {fmtPrice(Math.round(p.price / p.nights))}/night.{" "}
                  {p.popular ? "Best odds of clear skies, the cheapest per night." : "When a full week is more than you need."}
                </p>
                <span
                  className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${p.popular ? "text-gold" : "text-accent"}`}
                >
                  {p.popular ? "Reserve your week" : "Reserve 3 nights"}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

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

      {/* Newsletter promo — a first-session discount nudge where visitors compare prices. */}
      <div className="mt-8">
        <NewsletterSignup source="pricing" variant="compact" />
      </div>
    </Section>
  );
}
