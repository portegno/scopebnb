import Link from "next/link";
import Image from "next/image";
import { Section, Eyebrow, CTA, Card } from "@/components/ui";
import { HomeLogo } from "@/components/HomeLogo";
import { site } from "@/config/site";
import { products } from "@/data/products";
import { equipment, fieldOfView } from "@/data/equipment";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative -mt-16 overflow-hidden px-6 pt-28 pb-20 text-center">
        <div className="mx-auto max-w-3xl">
          <HomeLogo className="mx-auto mb-10 h-14 w-auto sm:h-20" />
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs text-muted ring-1 ring-hairline">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            System operational · Bortle {site.location.bortle}
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
            Control the night.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">{site.tagline}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CTA href="/book">Book a night</CTA>
            <CTA href="/how-it-works" variant="secondary">
              How it works
            </CTA>
          </div>
          <p className="mt-6 text-sm text-muted">
            {site.location.clearNightsPerYear}+ clear nights a year · {fieldOfView.widthDeg}° × {fieldOfView.heightDeg}° wide field
          </p>
        </div>
      </section>

      {/* Products */}
      <Section>
        <Eyebrow>Two ways to image</Eyebrow>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Pick your path</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <p className="text-xs uppercase tracking-wider text-accent">{p.audience}</p>
              <h3 className="mt-2 text-xl font-semibold">{p.name}</h3>
              <p className="mt-2 text-sm text-muted">{p.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-foreground/85">
                    <span className="text-accent">✦</span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className="mt-6 text-sm font-semibold text-accent hover:underline"
              >
                Learn more →
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      {/* Equipment showcase */}
      <Section className="bg-surface/40">
        <Eyebrow>The rig</Eyebrow>
        <h2 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Exceptional optics under exceptional skies
        </h2>
        <p className="mt-4 max-w-3xl text-muted">
          A wide-field apochromatic refractor on a harmonic GoTo mount with a cooled
          color camera and motorized rotator, all under pristine Bortle 1 skies in Texas.
        </p>
        <p className="mt-3 text-sm text-muted">
          Field of view ≈ {fieldOfView.widthDeg}° × {fieldOfView.heightDeg}° · {fieldOfView.pixelScaleArcsec}″/px
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-stretch">
          <div className="relative aspect-[7/5] overflow-hidden rounded-xl bg-black ring-1 ring-hairline">
            <Image
              src="/images/equipment/redcat-91.jpg"
              alt="William Optics RedCat 91 WIFD"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
              priority
            />
          </div>
          <Card>
            <ul className="divide-y divide-hairline">
              {equipment.slice(0, 6).map((e) => (
                <li key={e.role} className="flex flex-col py-3 sm:flex-row sm:justify-between sm:gap-4">
                  <span className="text-xs uppercase tracking-wider text-muted">{e.role}</span>
                  <span className="text-sm text-foreground/90 sm:text-right">{e.name}</span>
                </li>
              ))}
            </ul>
            <Link href="/imaging" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
              Full specs →
            </Link>
          </Card>
        </div>
      </Section>

      {/* Final CTA */}
      <Section className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Ready to capture your first galaxy?</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Start your remote imaging journey tonight. No equipment, no light pollution, no hassle.
        </p>
        <div className="mt-6 flex justify-center">
          <CTA href="/book">Book your night now</CTA>
        </div>
      </Section>
    </>
  );
}
