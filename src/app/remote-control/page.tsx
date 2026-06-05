import type { Metadata } from "next";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Remote Control (NINA)" };

const requirements = [
  "Familiarity with N.I.N.A. (Nighttime Imaging 'N' Astronomy)",
  "Comfortable building and running imaging sequences",
  "Stable internet connection for the remote desktop session",
];

const features = [
  { t: "Full sequence control", d: "Build and run your own N.I.N.A. sequences: autofocus, dithering, plate-solving." },
  { t: "Your targets, your plan", d: "Slew anywhere visible, set exposures and filters exactly how you want." },
  { t: "Pro gear, dark skies", d: "Drive a wide-field APO + cooled color camera under Bortle 1, from anywhere." },
];

export default function RemoteControl() {
  return (
    <>
      <Section>
        <Eyebrow>Remote Control · for advanced imagers</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Drive the rig yourself with N.I.N.A.
        </h1>
        <p className="mt-4 max-w-2xl text-muted">
          Rent the telescope and operate it remotely, just like it&apos;s in your backyard, but
          under some of the darkest skies on Earth.
        </p>
        <div className="mt-8">
          <CTA href="/remote-control/book">Reserve a night</CTA>
        </div>
      </Section>

      <Section className="bg-surface/40">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.t}>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted">{f.d}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <h2 className="text-2xl font-semibold tracking-tight">What you&apos;ll need</h2>
        <ul className="mt-6 space-y-3">
          {requirements.map((r) => (
            <li key={r} className="flex gap-3 text-sm text-foreground/85">
              <span className="text-accent">✦</span>
              {r}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
