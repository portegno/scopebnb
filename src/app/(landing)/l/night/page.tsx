import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/landing/Hero";
import { LandingLink } from "@/components/landing/LandingLink";
import { SkyParallax } from "@/components/landing/SkyParallax";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { Reveal } from "@/components/landing/Reveal";
import { Section, Title, Lead, Steps, Objections, Facts } from "@/components/landing/parts";
import { site } from "@/config/site";

/**
 * Landing 2 of 2 — the direct offer.
 *
 * The other shape Verónica needs, and it exists to prove the vocabulary works
 * for both. Same furniture, different ask: this one sends people to /book
 * instead of asking for an address, so the CTA is a link and not a form.
 *
 * That difference is the whole reason for writing two by hand. On paper the
 * `formulario` and `cierre` blocks looked like one thing with a flag; rendered,
 * they're a form and a link, and they don't share a line of markup.
 */
export const metadata: Metadata = {
  title: "Book a night on the scope",
  description:
    "A professional imaging rig under Bortle 1 skies in Texas, rented by the night. Managed or driven by you.",
  robots: { index: false, follow: false },
};

const PASOS = [
  {
    n: "01",
    t: "Choose the night",
    d: "Availability is real — one rig, one sky. Pick a date and see what's above the horizon that night.",
  },
  {
    n: "02",
    t: "Frame the target",
    d: "Rotate the camera and preview the framing against the actual sky before anything is committed.",
  },
  {
    n: "03",
    t: "Get the data",
    d: "Light frames and calibration within 24 hours. A finished, integrated image is an optional extra.",
  },
];

const OBJECIONES = [
  {
    q: "What if the night is clouded out?",
    a: "You don&apos;t pay for weather. A clouded session is rescheduled to the next clear night that works for you.",
  },
  {
    q: "Do I need to know N.I.N.A.?",
    a: "Only if you want to drive. Managed sessions are captured by our team from a target you choose; remote sessions hand you the sequencer.",
  },
  {
    q: "What comes back to me?",
    a: "Every light frame from the session plus calibration. They're yours — stack and process them however you like.",
  },
  {
    q: "How dark is Bortle 1, really?",
    a: "Dark enough that the Milky Way casts a shadow. It's the darkest class on the scale and there are around 270 clear nights a year here.",
  },
];

const DATOS = [
  { k: "Bortle", v: "1" },
  { k: "Clear nights / yr", v: String(site.location.clearNightsPerYear) },
  { k: "Data back in", v: "24 h" },
  { k: "Rigs", v: "1" },
];

export default function NightLanding() {
  return (
    <>
      <Suspense fallback={null}>
        <SkyParallax />
      </Suspense>

      <Suspense fallback={<div className="min-h-[92svh]" />}>
        <Hero
          eyebrow="Remote imaging · West Texas"
          title={<>Rent the darkest sky in Texas for one night.</>}
          sub="A professional rig at Starfront Observatories under Bortle 1 skies. Captured for you, or driven by you. The frames come back within a day."
          image="/images/hero/foto1.jpg"
          imageAlt="Night sky over Starfront Observatories, Rockwood, Texas"
        >
          {/* LandingLink and never a bare Link: this href is the one that has to
              keep the account id, or the booking it produces belongs to nobody. */}
          <LandingLink href="/book" className="lp-cta">
            See available nights
          </LandingLink>
        </Hero>
      </Suspense>

      <Section>
        <Title kicker="What comes back">One frame of seventy-four.</Title>
        <Lead>
          A single 180-second exposure through a dual-narrowband filter, auto-stretched, nothing
          else done to it. Drag to see how the same data reads in mono and in duochrome — this is
          what lands in your folder, before you&apos;ve processed anything.
        </Lead>
        <Reveal delay={120}>
          <div className="mt-10">
            <BeforeAfter
              a="/images/sessions/crescent-2026-07-11.jpg"
              b="/images/sessions/crescent-2026-07-11-color.jpg"
              labelA="Mono"
              labelB="Duochrome"
              alt="Crescent Nebula (NGC 6888), single 180-second L-Extreme exposure"
            />
            <p className="mt-3 text-xs text-muted">
              Crescent Nebula (NGC 6888) · 180 s · Optolong L-Extreme · 6 h 18 m session, 74 lights
            </p>
          </div>
        </Reveal>
      </Section>

      <Section>
        <Title kicker="How a night works">Three things happen, in this order.</Title>
        <Steps items={PASOS} />
      </Section>

      <Section>
        <Title kicker="The place">Where the photons come from.</Title>
        <Facts items={DATOS} />
        <Lead>
          {site.location.observatory} · {site.location.address[1]}, {site.location.address[2]}
        </Lead>
      </Section>

      <Section>
        <Title kicker="Before you ask">The four questions everyone asks.</Title>
        <Objections items={OBJECIONES} />
      </Section>

      <Section className="pb-32 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-xl text-2xl leading-tight font-semibold text-balance sm:text-3xl">
            Pick a night. We&apos;ll point it wherever you want.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 flex justify-center">
            <Suspense fallback={null}>
              <LandingLink href="/book" className="lp-cta">
                See available nights
              </LandingLink>
            </Suspense>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
