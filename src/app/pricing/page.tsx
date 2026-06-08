import type { Metadata } from "next";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";
import { NIGHT_TIERS, fmtPrice, remotePrice } from "@/lib/pricing";

export const metadata: Metadata = { title: "Pricing" };

function TierTable({ remote = false }: { remote?: boolean }) {
  return (
    <ul className="mt-5 divide-y divide-hairline">
      {NIGHT_TIERS.map((t) => (
        <li key={t.key} className="flex items-center justify-between gap-3 py-3">
          <span className="flex items-center gap-3 text-sm text-foreground/90">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: t.color }} />
            {t.key === "dark" ? "Dark (new moon)" : t.label}
          </span>
          <span className="text-xl font-semibold text-gold">
            {fmtPrice(remote ? remotePrice(t.price) : t.price)}
          </span>
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
        No subscription. You only pay when you book, and every night is priced by how dark it is.
        New-moon nights image the faintest targets, so they cost the most.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {/* Managed Imaging */}
        <Card className="flex flex-col">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Managed Imaging</p>
          <h2 className="mt-1 text-lg font-semibold">We capture, you receive the data</h2>
          <p className="mt-1 text-sm text-muted">
            Pick a target, frame it, and our team runs the rig. Calibrated FITS delivered within 24h.
          </p>
          <TierTable />
          <p className="mt-4 text-xs text-muted">Flat price for the whole imageable night.</p>
          <div className="mt-6">
            <CTA href="/book?mode=managed">Book a night</CTA>
          </div>
        </Card>

        {/* Remote Control */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Remote Control (NINA)</p>
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">+10%</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold">You drive the rig yourself</h2>
          <p className="mt-1 text-sm text-muted">
            Rent the telescope for the whole night and operate it remotely with N.I.N.A. — point it at
            anything you like.
          </p>
          <TierTable remote />
          <p className="mt-4 text-xs text-muted">Per night, hands-on. 10% above the managed rate.</p>
          <div className="mt-6">
            <CTA href="/book?mode=remote" variant="secondary">
              Reserve a night
            </CTA>
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
    </Section>
  );
}
