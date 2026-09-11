import type { Metadata } from "next";
import { Suspense } from "react";
import { Hero } from "@/components/landing/Hero";
import { LeadForm } from "@/components/landing/LeadForm";
import { SkyParallax } from "@/components/landing/SkyParallax";
import { BeforeAfter } from "@/components/landing/BeforeAfter";
import { Galeria, type Objetivo } from "@/components/landing/Galeria";
import { Equipo } from "@/components/landing/Equipo";
import { equipment, fieldOfView } from "@/data/equipment";
import { Reveal } from "@/components/landing/Reveal";
import { Personaje } from "@/components/landing/Personaje";
import { Section, Title, Lead, Steps, Objections, Facts } from "@/components/landing/parts";
import { site } from "@/config/site";
import { resolverEnlace, enlaceRecordado } from "@/lib/campaign/link";
import { CampaignBeacon } from "@/components/landing/CampaignBeacon";
import { copiaDe } from "./copia";

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
/**
 * **La metadata queda en inglés a propósito.** La página es `noindex`, así que
 * nadie la encuentra buscando: el título sólo se ve en la pestaña de quien ya
 * abrió el mail, y ese ya tiene la página en su idioma. Hacerla dinámica
 * obligaría a `generateMetadata`, que vuelve a leer el enlace para decorar una
 * pestaña.
 */
export const metadata: Metadata = {
  title: "A week of Bortle 1 for your club",
  description:
    "Seven consecutive nights on a professional rig under Bortle 1 skies, driven by your members through N.I.N.A. Every frame is yours.",
  robots: { index: false, follow: false },
};

/* PASOS se arma con la copia del idioma, adentro del componente. */

/* OBJECIONES se arma con la copia del idioma, adentro del componente. */

/**
 * Lo que sale de este equipo.
 *
 * `captura` queda sin poner a propósito: las horas, el filtro y la cantidad de
 * tomas son justo lo que un astrofotógrafo lee, y justo lo que sería fácil de
 * inventar e imposible de verificar para quien mira. Se completa cuando alguien
 * que lo sabe lo diga, y hasta entonces no se dibuja.
 */
const FOTOS = [
  { src: "/images/targets/m31-andromeda.jpg", alto: true },
  // El mismo campo, ancho y cerca: el encuadre es una decisión que se toma
  // antes de arrancar la secuencia, y eso se muestra mejor de lo que se cuenta.
  { src: "/images/targets/ic1396-elephants-trunk-wide.jpg" },
  { src: "/images/targets/ic1396-elephants-trunk-detail.jpg" },
  // Y la tercera es el mismo objeto procesado en banda angosta. Para alguien
  // que fotografía, ver dos paletas del mismo dato dice que lo que se lleva es
  // material y no una foto terminada.
  { src: "/images/targets/ic1396-elephants-trunk-narrowband.jpg" },
];

/* DATOS se arma con la copia del idioma, adentro del componente. */

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

  // **El idioma sale del enlace.** Un club al que Verónica le escribió en
  // italiano llega a una página en italiano; cualquiera que entre sin código la
  // ve en inglés, que es el idioma en el que la casa puede sostener una
  // conversación por escrito con quien sea.
  const c = copiaDe(enlace?.idioma);
  const OBJETIVOS: Objetivo[] = [
    { ...FOTOS[0], objeto: c.objetivos.m31, catalogo: c.objetivos.m31cat },
    { ...FOTOS[1], objeto: c.objetivos.ancho, catalogo: "IC 1396A · wide field" },
    { ...FOTOS[2], objeto: c.objetivos.cerca, catalogo: "IC 1396A" },
    { ...FOTOS[3], objeto: c.objetivos.banda, catalogo: "IC 1396A · SHO" },
  ];
  const DATOS = [
    { k: c.datos.noches, v: "7" },
    { k: c.datos.precio, v: "$300" },
    { k: c.datos.bortle, v: "1" },
    { k: c.datos.despejadas, v: String(site.location.clearNightsPerYear) },
  ];

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
          eyebrow={c.hero.eyebrow}
          club={enlace?.cuentaNombre ?? null}
          title={c.hero.title}
          sub={c.hero.sub}
          image="/images/hero/foto2.jpg"
          imageAlt={c.hero.imageAlt}
        >
          <LeadForm
            landing="club"
            cta={c.form.cta}
            hint={c.form.hint}
            done={c.form.done}
          />
        </Hero>
      </Suspense>

      {/* What's in it, before anything else. The offer is the argument: a page
          that explains the sky for three sections before saying what you get is
          a page that gets closed during the second one. */}
      <Section>
        <Title kicker={c.oferta.kicker}>{c.oferta.title}</Title>
        <Lead>{c.oferta.lead}</Lead>
        <Facts items={DATOS} />
        <Reveal delay={140}>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">{c.oferta.cuenta}</p>
        </Reveal>
      </Section>

      {/* El resultado primero y la materia prima después. Un club decide mirando
          lo que sale; el sub crudo explica cómo llega, y eso sólo interesa
          cuando ya te interesó lo otro. */}
      <Section>
        <Title kicker={c.galeria.kicker}>{c.galeria.title}</Title>
        <Lead>{c.galeria.lead}</Lead>
        <Galeria objetivos={OBJETIVOS} />
      </Section>

      <Section>
        <Title kicker={c.crudo.kicker}>{c.crudo.title}</Title>
        <Lead>{c.crudo.lead}</Lead>
        <Reveal delay={120}>
          <div className="mt-10">
            <BeforeAfter
              a="/images/sessions/crescent-2026-07-11.jpg"
              b="/images/sessions/crescent-2026-07-11-color.jpg"
              labelA={c.crudo.mono}
              labelB={c.crudo.duo}
              alt={c.crudo.alt}
            />
            <p className="mt-3 text-xs text-muted">{c.crudo.pie}</p>
          </div>
        </Reveal>
      </Section>

      {/* The people block. The page is otherwise all sky and hardware, and what
          a club is deciding is whether somebody picks up on night one. */}
      <Section>
        <Personaje
          kicker={c.mike.kicker}
          title={c.mike.title}
          image="/images/mike3.png"
          alt={c.mike.alt}
        >
          <p>{c.mike.p1}</p>
          <p>{c.mike.p2}</p>
        </Personaje>
      </Section>

      {/* El equipo, después de la galería y no antes: primero lo que sale, y
          recién cuando alguien quiere saber cómo, el cómo. */}
      <Section>
        <Title kicker={c.equipo.kicker}>{c.equipo.title}</Title>
        <Lead>{c.equipo.lead}</Lead>
        <Equipo
          campo={`${fieldOfView.widthDeg}° × ${fieldOfView.heightDeg}°`}
          escala={`${fieldOfView.pixelScaleArcsec}″`}
          partes={equipment.map((e) => ({ que: e.role, cual: `${e.name}. ${e.detail}` }))}
        />
      </Section>

      <Section>
        <Title kicker={c.pasos.kicker}>{c.pasos.title}</Title>
        <Steps items={c.pasos.items} />
        <Reveal delay={280}>
          <p className="mt-8 text-sm text-muted">
            {c.pasos.guia}
            {/* A plain <a>, not LandingLink: it's a file, not a page, and there
                is nothing downstream to attribute. */}
            <a
              href="/SCOPEbnb_Remote_Imaging_Guide.pdf"
              className="text-accent underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.pasos.guiaLink}
            </a>
            {c.pasos.guiaFin}
          </p>
        </Reveal>
      </Section>

      <Section>
        <Title kicker={c.objeciones.kicker}>{c.objeciones.title}</Title>
        <Objections items={c.objeciones.items} />
      </Section>

      {/* Same action, same words as the hero. Two different primary CTAs are not
          two chances, they are none. */}
      <Section className="pb-32 text-center">
        <Reveal>
          <h2 className="mx-auto max-w-xl text-2xl leading-tight font-semibold text-balance sm:text-3xl">{c.cierre.title}</h2>
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
