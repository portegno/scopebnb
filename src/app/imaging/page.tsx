import type { Metadata } from "next";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";
import { ProductShowcase } from "@/components/ProductShowcase";
import { equipment, fieldOfView, opticalSpecs } from "@/data/equipment";

export const metadata: Metadata = { title: "Managed Imaging" };

const flow = [
  { t: "Pick a night", d: "We show moon phase and the weather forecast for each available date." },
  { t: "Choose a target", d: "Browse the seasonal list or enter any object, and we confirm it fits the field." },
  { t: "Frame it", d: "Rotate the camera and preview the framing on a real image of the sky." },
  { t: "We capture", d: "Our team handles operation, guiding and focus. You get FITS within 24h." },
];

export default function Imaging() {
  return (
    <>
      <Section>
        <Eyebrow>Managed Imaging · for beginners</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          You choose the shot. We capture it.
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          No remote-control skills needed. Select a target that&apos;s visible on your night,
          dial in the framing with our live sky preview, and our team does the rest under Bortle 1 skies.
        </p>
        <div className="mt-8">
          <CTA href="/book">Start a booking</CTA>
        </div>
      </Section>

      <Section className="bg-surface/40">
        <h2 className="text-2xl font-semibold tracking-tight">How a managed session works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {flow.map((s, i) => (
            <Card key={s.t}>
              <span className="text-sm font-semibold text-accent">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </Card>
          ))}
        </div>
      </Section>

      <ProductShowcase />

      <Section className="pt-0">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Full specs</Eyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Full specifications</h2>
            <p className="mt-3 text-sm text-muted">
              {opticalSpecs.apertureMm}mm f/{opticalSpecs.focalRatio} apochromatic refractor ·
              {" "}{opticalSpecs.focalLengthMm}mm focal length · {opticalSpecs.sensor.name} sensor.
              Field of view ≈ {fieldOfView.widthDeg}° × {fieldOfView.heightDeg}° at {fieldOfView.pixelScaleArcsec}″/px.
            </p>
          </div>
          <Card>
            <ul className="divide-y divide-hairline">
              {equipment.map((e) => (
                <li key={e.role} className="py-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-xs uppercase tracking-wider text-muted">{e.role}</span>
                    <span className="text-sm font-medium">{e.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{e.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>
    </>
  );
}
