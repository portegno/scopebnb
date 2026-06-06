import type { Metadata } from "next";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";
import { ProductShowcase } from "@/components/ProductShowcase";
import { equipment, fieldOfView, opticalSpecs } from "@/data/equipment";

export const metadata: Metadata = { title: "How it works" };

const steps = [
  { n: "01", t: "Create your account", d: "Sign up for free in under two minutes." },
  { n: "02", t: "Choose your path", d: "Managed imaging or hands-on remote control — you pick at the start of every booking." },
  { n: "03", t: "Pick a night & target", d: "We show moon phase and weather. Frame your shot on the live sky preview." },
  { n: "04", t: "We capture (or you do)", d: "Our team runs the rig, or you drive it yourself with N.I.N.A." },
  { n: "05", t: "Download your FITS", d: "Calibrated 16-bit FITS, calibration frames and a JPEG preview within 24h." },
];

const managedFlow = [
  { t: "Pick a night", d: "We show moon phase and the weather forecast for each available date." },
  { t: "Choose a target", d: "Browse the seasonal list or enter any object, and we confirm it fits the field." },
  { t: "Frame it", d: "Rotate the camera and preview the framing on a real image of the sky." },
  { t: "We capture", d: "Our team handles operation, guiding and focus. You get FITS within 24h." },
];

const remoteFeatures = [
  { t: "Full sequence control", d: "Build and run your own N.I.N.A. sequences: autofocus, dithering, plate-solving." },
  { t: "Your targets, your plan", d: "Slew anywhere visible, set exposures and filters exactly how you want." },
  { t: "Pro gear, dark skies", d: "Drive a wide-field APO + cooled color camera under Bortle 1, from anywhere." },
];

const remoteRequirements = [
  "Familiarity with N.I.N.A. (Nighttime Imaging 'N' Astronomy)",
  "Comfortable building and running imaging sequences",
  "Stable internet connection for the remote desktop session",
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

        <div className="mt-10">
          <CTA href="/book">Book a night</CTA>
        </div>
      </Section>

      {/* Two products, one rig — both branches of the single booking flow. */}
      <Section className="bg-surface/40">
        <Eyebrow>Two ways to image</Eyebrow>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">One rig, two ways to shoot it</h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          You choose how you want to work at the start of every booking — we handle the capture, or you take the
          controls.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Managed */}
          <Card id="managed" className="flex h-full scroll-mt-24 flex-col">
            <span className="text-2xl" aria-hidden="true">
              🛰️
            </span>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-lg font-semibold">Managed Imaging</h3>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">For beginners</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              You choose the shot, we capture it. Pick a target that&apos;s visible on your night, dial in the
              framing with our live sky preview, and our team does the rest under Bortle 1 skies.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-foreground/85">
              {managedFlow.map((s, i) => (
                <li key={s.t} className="flex gap-3">
                  <span className="font-semibold text-accent">{i + 1}</span>
                  <span>
                    <span className="font-medium text-foreground">{s.t}.</span> {s.d}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <CTA href="/book?mode=managed">Request an image →</CTA>
            </div>
          </Card>

          {/* Remote */}
          <Card id="remote" className="flex scroll-mt-24 flex-col">
            <span className="text-2xl" aria-hidden="true">
              🎛️
            </span>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-lg font-semibold">Remote Control (NINA)</h3>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">For advanced imagers</span>
            </div>
            <p className="mt-2 text-sm text-muted">
              Rent the telescope and operate it remotely with N.I.N.A., just like it&apos;s in your backyard — but
              under some of the darkest skies on Earth.
            </p>
            <ul className="mt-5 space-y-3 text-sm text-foreground/85">
              {remoteFeatures.map((f) => (
                <li key={f.t} className="flex gap-3">
                  <span className="text-accent">✦</span>
                  <span>
                    <span className="font-medium text-foreground">{f.t}.</span> {f.d}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">What you&apos;ll need</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted">
              {remoteRequirements.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-accent">·</span>
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <CTA href="/book?mode=remote" variant="secondary">
                Take control →
              </CTA>
            </div>
          </Card>
        </div>
      </Section>

      {/* The rig — equipment showcase + full specs. */}
      <ProductShowcase />

      <Section className="pt-0">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Full specs</Eyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Full specifications</h2>
            <p className="mt-3 text-sm text-muted">
              {opticalSpecs.apertureMm}mm f/{opticalSpecs.focalRatio} apochromatic refractor ·{" "}
              {opticalSpecs.focalLengthMm}mm focal length · {opticalSpecs.sensor.name} sensor. Field of view ≈{" "}
              {fieldOfView.widthDeg}° × {fieldOfView.heightDeg}° at {fieldOfView.pixelScaleArcsec}″/px.
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
