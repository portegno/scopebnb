import type { Metadata } from "next";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";
import { nightlyPlans, packages, type Plan } from "@/data/pricing";

export const metadata: Metadata = { title: "Pricing" };

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Card className={plan.highlight ? "ring-2 ring-accent" : ""}>
      {plan.highlight && (
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
          Most popular
        </span>
      )}
      <h3 className="mt-1 text-lg font-semibold">{plan.name}</h3>
      <p className="mt-3">
        <span className="text-3xl font-semibold">${plan.priceUsd.toLocaleString()}</span>{" "}
        <span className="text-sm text-muted">{plan.unit}</span>
      </p>
      <p className="mt-1 text-sm text-muted">{plan.note}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2 text-foreground/85">
            <span className="text-accent">✓</span>
            {f}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function Pricing() {
  return (
    <>
      <Section>
        <Eyebrow>Pricing</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Simple rates, no hidden fees</h1>
        <p className="mt-4 max-w-2xl text-muted">
          No subscription. You only pay when you book. Weather guarantee included: if your night
          isn&apos;t usable, we reschedule at no extra cost.
        </p>
        <p className="mt-2 text-xs text-muted">Draft pricing. Final ScopeBnB rates to be confirmed.</p>

        <h2 className="mt-12 text-xl font-semibold">Per night</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {nightlyPlans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold">Multi-night packages</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {packages.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>

        <div className="mt-12">
          <CTA href="/book">Book a night</CTA>
        </div>
      </Section>
    </>
  );
}
