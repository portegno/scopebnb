import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/landing/Hero";
import { LeadForm } from "@/components/landing/LeadForm";
import { SkyParallax } from "@/components/landing/SkyParallax";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { Galeria, type Objetivo } from "@/components/landing/Galeria";
import { Reveal } from "@/components/landing/Reveal";
import { Personaje } from "@/components/landing/Personaje";
import { Section, Title, Lead, Steps, Objections, Facts } from "@/components/landing/parts";
import { site } from "@/config/site";
import { resolverEnlace, enlaceRecordado } from "@/lib/campaign/link";
import { CampaignBeacon } from "@/components/landing/CampaignBeacon";

/**
 * Landing 1 of 2 — the club offer.
 *
 * **This page had no value proposition and it was worth saying out loud.** The
 * first version sold a free one-hour webinar, and the reason it read hollow is
 * that nobody ever decided ScopeBnB runs webinars: the offer was invented to
 * have something for a lead-capture page to ask for. A benefit statement
 * written on top of an offer that doesn't exist comes out vague no matter how
 * it's phrased, and no amount of design fixes that.
 *
 * What it sells now is a real product that has already been sold once: the flat
 * $300 remote week — seven consecutive nights, driven by the customer through
 * N.I.N.A. Everything on this page exists. The week is `remotePlan: "week"` in
 * the booking data; the manual is the PDF in /public; the onboarding call is
 * the one thing that's new, and it's a commitment the house is making, not a
 * claim about the past.
 *
 * The angle is what makes it a club offer instead of a rental ad: **$300 across
 * a membership is a few dollars a head**, which turns a purchase no single
 * member would make into something a club treasury signs off on in one meeting.
 * That arithmetic is available to a club and to nobody else, and it's the whole
 * reason Verónica writes to clubs and not to individuals.
 *
 * `noindex`: a page addressed to one account has no business in search, where
 * it would appear stripped of its `utm_source` and personalised to nobody.
 */
export const metadata: Metadata = {
  title: "A week of Bortle 1 for your club",
  description:
    "Seven consecutive nights on a professional rig under Bortle 1 skies, driven by your members through N.I.N.A. Every frame is yours.",
  robots: { index: false, follow: false },
};

const PASOS = [
  {
    n: "01",
    t: "Pick your week",
    d: "Seven nights in a row, on dates that suit the club. One rig, one sky, so the calendar is real availability and not a queue.",
  },
  {
    n: "02",
    t: "Half an hour on night one",
    d: "A live call with whoever will be driving: connecting, framing, focus, and starting a sequence. After that the week is yours.",
  },
  {
    n: "03",
    t: "Everyone keeps everything",
    d: "Every light frame and every calibration frame from all seven nights. Split them, stack them, or have five members process the same data and compare.",
  },
];

const OBJECIONES = [
  {
    q: "Does someone in the club need to know N.I.N.A.?",
    a: "No. That's what the first-night call is for, and you get the remote imaging guide in writing so nobody has to remember it. If a member already runs N.I.N.A. at home, they'll be at ease in ten minutes: it's the same software, pointed at better sky.",
  },
  {
    q: "What if the week is clouded out?",
    a: "Around 270 nights a year are clear here, so a whole week lost is unlikely. Weather isn't your problem either: nights lost to cloud are made up. That's why the week is sold as seven nights and not as seven dates.",
  },
  {
    q: "Can several members use it during the week?",
    a: "Yes, and that's the point. The club decides who drives which night. Nothing stops you from giving each night to a different member, or running one long project across all seven.",
  },
  {
    q: "Who owns the data?",
    a: "You do. All of it, raw, with calibration. There's no watermark, no exclusivity and nothing held back. What your members do with it afterwards is entirely theirs.",
  },
];

/**
 * Lo que sale de este equipo.
 *
 * `captura` queda sin poner a propósito: las horas, el filtro y la cantidad de
 * tomas son justo lo que un astrofotógrafo lee, y justo lo que sería fácil de
 * inventar e imposible de verificar para quien mira. Se completa cuando alguien
 * que lo sabe lo diga, y hasta entonces no se dibuja.
 */
const OBJETIVOS: Objetivo[] = [
  { src: "/images/targets/m31-andromeda.jpg", objeto: "Andromeda Galaxy",
    catalogo: "M31 · with M32 and M110", alto: true },
  { src: "/images/targets/ic1396-elephants-trunk-wide.jpg",
    objeto: "Elephant's Trunk Nebula", catalogo: "IC 1396A · narrowband" },
  { src: "/images/targets/ic1396-elephants-trunk-detail.jpg",
    objeto: "Elephant's Trunk, closer", catalogo: "IC 1396A · narrowband" },
];

const DATOS = [
  { k: "Nights", v: "7" },
  { k: "Flat price", v: "$300" },
  { k: "Bortle", v: "1" },
  { k: "Clear nights / yr", v: String(site.location.clearNightsPerYear) },
];

/**
 * The page resolves `?id=` on the server, which is what lets the mail carry a
 * short code instead of the campaign written in the address bar. It also sets
 * the cookie that survives the days between reading the mail and the club
 * actually deciding — forwarding the code on internal links only covers the
 * session, and the session is not where a committee makes up its mind.
 *
 * Reading searchParams makes this route dynamic, and that is a real trade: it
 * stops being static. It buys the greeting arriving in the HTML instead of
 * after hydration, which on a slow phone is the difference between the club
 * seeing its own name and seeing it appear a second later.
 */
export default async function ClubLanding({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  // The code from the URL, or the one this visitor arrived on earlier: a club
  // that read the mail on Monday and comes back from the meeting on Thursday
  // still gets its own page, and the booking still traces back.
  const enlace = await resolverEnlace(id ?? (await enlaceRecordado()) ?? undefined);

  return (
    <>
      {enlace ? (
        <CampaignBeacon
          codigo={enlace.codigo}
          cuenta={enlace.cuenta}
          campania={enlace.campania}
          medio={enlace.medio}
        />
      ) : null}
      <Suspense fallback={null}>
        <SkyParallax />
      </Suspense>

      <Suspense fallback={<div className="min-h-[92svh]" />}>
        <Hero
          eyebrow="For astronomy clubs"
          club={enlace?.cuentaNombre ?? null}
          title={<>Your club&apos;s gear is fine. Your sky isn&apos;t.</>}
          sub="Seven consecutive nights on a professional rig under Bortle 1 skies in West Texas, driven by your own members. $300 for the week, which across a membership is a few dollars a head."
          image="/images/hero/foto2.jpg"
          imageAlt="Emission nebula photographed from the ScopeBnB rig in Rockwood, Texas"
        >
          <LeadForm
            landing="club"
            cta="Ask about a week"
            hint="One email. We'll reply with the open weeks and what the club needs to decide."
            done="Got it. We'll write back with the weeks that are open and what the club needs to decide."
          />
        </Hero>
      </Suspense>

      {/* What's in it, before anything else. The offer is the argument: a page
          that explains the sky for three sections before saying what you get is
          a page that gets closed during the second one. */}
      <Section>
        <Title kicker="What the club gets">One week, and everything that comes out of it.</Title>
        <Lead>
          Seven nights in a row on the rig, a half-hour call on the first night so somebody in the
          club knows how to drive it, the remote imaging guide in writing, and every frame from
          all seven nights. Three hundred dollars, flat, no subscription.
        </Lead>
        <Facts items={DATOS} />
        <Reveal delay={140}>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
            The arithmetic is the part that only works for a club: split across thirty members
            it&apos;s ten dollars each, for a sky none of them can reach from home at any price.
          </p>
        </Reveal>
      </Section>

      {/* El resultado primero y la materia prima después. Un club decide mirando
          lo que sale; el sub crudo explica cómo llega, y eso sólo interesa
          cuando ya te interesó lo otro. */}
      <Section>
        <Title kicker="What comes out of it">Targets shot on this rig.</Title>
        <Lead>
          The same telescope your members would be driving, on the nights it was pointed at these.
          Wide field and detail on the same object: the framing is a choice you make before the
          sequence starts.
        </Lead>
        <Galeria objetivos={OBJETIVOS} />
      </Section>

      <Section>
        <Title kicker="What comes back">One frame of seventy-four. Times seven nights.</Title>
        <Lead>
          A single 180-second exposure through a dual-narrowband filter, auto-stretched and
          nothing else done to it. Drag to see how the same data reads in mono and in duochrome.
          One night is 74 of these; the week is seven of those nights.
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

      {/* The people block. The page is otherwise all sky and hardware, and what
          a club is deciding is whether somebody picks up on night one. */}
      <Section>
        <Personaje
          kicker="Night one"
          title="Somebody walks you through it before you touch anything."
          image="/images/mike3.png"
          alt="Mike, from ScopeBnB, standing beside the imaging rig"
        >
          <p>
            Half an hour on a call with whoever in the club is going to drive: connecting to the
            rig, finding the target, framing it, focus, and starting the first sequence. By the
            end of it the club has taken its own first frame.
          </p>
          <p>
            You keep the written guide too, so the member who wasn&apos;t on the call on Monday can
            still take the scope on Thursday.
          </p>
        </Personaje>
      </Section>

      <Section>
        <Title kicker="How a week works">Three things happen, in this order.</Title>
        <Steps items={PASOS} />
        <Reveal delay={280}>
          <p className="mt-8 text-sm text-muted">
            The written guide is{" "}
            {/* A plain <a>, not LandingLink: it's a file, not a page, and there
                is nothing downstream to attribute. */}
            <a
              href="/SCOPEbnb_Remote_Imaging_Guide.pdf"
              className="text-accent underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              the remote imaging guide
            </a>
            . It&apos;s the same one we walk through on the call.
          </p>
        </Reveal>
      </Section>

      <Section>
        <Title kicker="Before you ask">The four questions every club asks.</Title>
        <Objections items={OBJECIONES} />
      </Section>

      {/* Same action, same words as the hero. Two different primary CTAs are not
          two chances, they are none. */}
      <Section className="pb-32 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-xl text-2xl leading-tight font-semibold text-balance sm:text-3xl">
            Seven nights under the darkest sky in Texas, and your members keep every frame.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <div className="mt-8 flex justify-center">
            <Suspense fallback={null}>
              <LeadForm
                landing="club"
                cta="Ask about a week"
                hint="One email. We'll reply with the open weeks and what the club needs to decide."
                done="Got it. We'll write back with the weeks that are open and what the club needs to decide."
              />
            </Suspense>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
