import type { Metadata } from "next";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";
import { products } from "@/data/products";

export const metadata: Metadata = { title: "How it works" };

const steps = [
  { n: "01", t: "Create your account", d: "Sign up for free in under two minutes." },
  { n: "02", t: "Choose your path", d: "Managed imaging or hands-on remote control." },
  { n: "03", t: "Pick a night & target", d: "We show moon phase and weather. Frame your shot on the live sky preview." },
  { n: "04", t: "We capture (or you do)", d: "Our team runs the rig, or you drive it yourself with N.I.N.A." },
  { n: "05", t: "Download your FITS", d: "Calibrated 16-bit FITS, calibration frames and a JPEG preview within 24h." },
];

export default function HowItWorks() {
  return (
    <>
      <Section>
        <Eyebrow>How it works</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">From your couch to deep space</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Remote imaging without leaving home. No light pollution, no equipment to own, no setup.
        </p>

        <ol className="mt-10 space-y-4">
          {steps.map((s) => (
            <li key={s.n}>
              <Card className="flex gap-5">
                <span className="text-lg font-semibold text-accent">{s.n}</span>
                <div>
                  <h3 className="font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted">{s.d}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="bg-surface/40">
        <h2 className="text-2xl font-semibold tracking-tight">Two products, one rig</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {products.map((p) => (
            <Card key={p.id}>
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-2 text-sm text-muted">{p.blurb}</p>
            </Card>
          ))}
        </div>
        <div className="mt-10">
          <CTA href="/book">Book a session</CTA>
        </div>
      </Section>
    </>
  );
}
