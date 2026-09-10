import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/landing/Hero";
import { LeadForm } from "@/components/landing/LeadForm";
import { SkyParallax } from "@/components/landing/SkyParallax";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { Reveal } from "@/components/landing/Reveal";
import { Section, Title, Lead, Steps, Objections, Facts } from "@/components/landing/parts";
import { site } from "@/config/site";

/**
 * Landing 1 of 2 — the lead magnet.
 *
 * Written by hand, on purpose. The block vocabulary for the agency's authoring
 * tool gets carved out of these two pages instead of being designed in the
 * abstract: a contract argued on paper produces blocks nobody can render well,
 * and you only find out on the sixth landing.
 *
 * Audience: an amateur astronomy club that got one cold email from Verónica.
 * The ask is small — an address in exchange for a session they can watch — and
 * that's the point: this page does not try to sell a night. It buys the right
 * to write again.
 *
 * `noindex`: a page addressed to one account has no business in search results,
 * where it would show up stripped of its `utm_source` and personalised to
 * nobody.
 */
export const metadata: Metadata = {
  title: "See a night on the scope",
  description:
    "A live session under Bortle 1 skies, watched from your club's screen. Free, one hour, no equipment needed.",
  robots: { index: false, follow: false },
};

const PASOS = [
  {
    n: "01",
    t: "Pick a night",
    d: "We run the session on a clear night from Rockwood, Texas — 270 of them a year. You get the date a week ahead.",
  },
  {
    n: "02",
    t: "Watch it happen",
    d: "One hour, live. Target selection, framing on the real sky, focus, and the first frames coming down.",
  },
  {
    n: "03",
    t: "Keep the data",
    d: "The light frames from that session go to everyone who attended, calibration included.",
  },
];

const OBJECIONES = [
  {
    q: "Do we need any equipment?",
    a: "No. The session runs on our rig and you watch it on a shared screen. A projector and someone to run the laptop is the whole setup on your side.",
  },
  {
    q: "What happens if it's cloudy?",
    a: "We move it. The forecast decides two days out and everyone who signed up gets the new date — clouds are the normal case in this work, not the exception.",
  },
  {
    q: "Who actually operates the telescope?",
    a: "Our team, live, while you ask questions. If somebody in the club wants to drive it themselves, that's the remote product and we can show it in the same hour.",
  },
  {
    q: "Is this a sales pitch?",
    a: "It's an hour of imaging with a real target. We'll say what a night costs if somebody asks, and that's as far as it goes.",
  },
];

const DATOS = [
  { k: "Bortle", v: "1" },
  { k: "Clear nights / yr", v: String(site.location.clearNightsPerYear) },
  { k: "Elevation", v: `${site.location.elevationM} m` },
  { k: "Session", v: "1 h" },
];

export default function WebinarLanding() {
  return (
    <>
      {/* Suspense because these read the query string, which is what carries the
          account. Without a boundary Next won't prerender the page at all. */}
      <Suspense fallback={null}>
        <SkyParallax />
      </Suspense>

      <Suspense fallback={<div className="min-h-[92svh]" />}>
        <Hero
          eyebrow="For astronomy clubs"
          title={<>Show your club a night under a Bortle 1 sky.</>}
          sub="One hour, live, on a professional rig in West Texas. You pick the target, we run the scope, everyone keeps the data."
          image="/images/hero/foto2.jpg"
          imageAlt="Deep-sky field photographed from the ScopeBnB rig in Rockwood, Texas"
        >
          <LeadForm
            landing="webinar"
            cta="Save our club a seat"
            hint="One email. We'll send the date and the link — nothing else."
            done="You're in. We'll write with the date and the link a week before the session."
          />
        </Hero>
      </Suspense>

      <Section>
        <Title kicker="What you'd see">This is one frame, straight off the scope.</Title>
        <Lead>
          A single 180-second exposure through a dual-narrowband filter, auto-stretched and
          nothing else. Drag to compare how the same data reads in mono and in duochrome. A full
          night is 74 of these.
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
              Crescent Nebula (NGC 6888) · 180 s · Optolong L-Extreme · 11 July 2026 · one light
              frame of 74
            </p>
          </div>
        </Reveal>
      </Section>

      <Section>
        <Title kicker="How the hour goes">Three things happen, in this order.</Title>
        <Steps items={PASOS} />
      </Section>

      <Section>
        <Title kicker="The place">Where the photons come from.</Title>
        <Facts items={DATOS} />
      </Section>

      <Section>
        <Title kicker="Before you ask">The four questions every club asks.</Title>
        <Objections items={OBJECIONES} />
      </Section>

      {/* Same action, same words as the hero. Not a second, different offer:
          two primary CTAs are not two chances, they are none. */}
      <Section className="pb-32 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-xl text-2xl leading-tight font-semibold text-balance sm:text-3xl">
            One night, one hour, and your club keeps the frames.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 flex justify-center">
            <Suspense fallback={null}>
              <LeadForm
                landing="webinar"
                cta="Save our club a seat"
                hint="One email. We'll send the date and the link — nothing else."
                done="You're in. We'll write with the date and the link a week before the session."
              />
            </Suspense>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
