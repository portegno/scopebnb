"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { site } from "@/config/site";

type Stat = { value: string; label: string };
type Hero = {
  kicker: string;
  name: string;
  tagline: string;
  image: string;
  stats: Stat[];
  glow: string;
};

const heroes: Hero[] = [
  {
    kicker: "The optic",
    name: "William Optics RedCat 91",
    tagline:
      "Wide-field clarity, edge to edge. A five-element Petzval astrograph engineered to render the faintest nebulae in a single, perfectly flat frame.",
    image: "/images/equipment/redcat-91.jpg",
    stats: [
      { value: "91mm", label: "Aperture" },
      { value: "ƒ/4.9", label: "Focal ratio" },
      { value: "448mm", label: "Focal length" },
      { value: "APO", label: "5-element Petzval" },
    ],
    glow: "radial-gradient(closest-side, rgba(176,124,255,0.35), transparent)",
  },
  {
    kicker: "The mount",
    name: "ZWO AM5N",
    tagline:
      "Effortless precision. A harmonic strain-wave equatorial that tracks the sky to sub-arcsecond accuracy. No counterweights, no compromise.",
    image: "/images/equipment/am5n.jpg",
    stats: [
      { value: "13kg", label: "Payload" },
      { value: "Harmonic", label: "Strain-wave drive" },
      { value: "GoTo", label: "Precision pointing" },
      { value: "0", label: "Counterweights" },
    ],
    glow: "radial-gradient(closest-side, rgba(110,168,254,0.35), transparent)",
  },
];

const bigStats: Stat[] = [
  { value: `Bortle ${site.location.bortle}`, label: "Darkest skies on Earth" },
  { value: `${site.location.clearNightsPerYear}+`, label: "Clear nights a year" },
  { value: "3.0° × 2.0°", label: "Wide field of view" },
  { value: "26MP", label: "Cooled color sensor" },
];

export function ProductShowcase() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    // Reveal on scroll.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));

    // Parallax.
    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-parallax]"));
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      for (const node of items) {
        const speed = parseFloat(node.dataset.parallax || "0");
        const r = node.getBoundingClientRect();
        const offset = (r.top + r.height / 2 - vh / 2) / vh;
        node.style.transform = `translate3d(0, ${(-offset * speed * 60).toFixed(1)}px, 0)`;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={root}>
      {/* Concept intro */}
      <section className="reveal px-6 py-28 text-center sm:py-36">
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-accent">The rig</span>
        <h2 className="mx-auto mt-5 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          The finest optics.
          <br />
          <span className="text-muted">The darkest skies.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Professional-grade glass under Bortle 1, the best dark-sky country in the Northern
          Hemisphere, in the heart of Texas.
        </p>
      </section>

      {/* Product heroes */}
      {heroes.map((h, i) => (
        <section key={h.name} className="reveal relative overflow-hidden px-6 py-20 sm:py-28">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
            {/* Image */}
            <div className={`relative ${i % 2 === 1 ? "md:order-2" : ""}`}>
              <div
                data-parallax="2.5"
                aria-hidden
                className="pointer-events-none absolute inset-[-10%] -z-10"
                style={{ background: h.glow }}
              />
              <div
                data-parallax="-1.6"
                className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-[4px] ring-1 ring-hairline"
              >
                <Image
                  src={h.image}
                  alt={h.name}
                  fill
                  sizes="(max-width: 768px) 90vw, 45vw"
                  className="object-contain"
                />
              </div>
            </div>

            {/* Copy */}
            <div className={i % 2 === 1 ? "md:order-1" : ""}>
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{h.kicker}</span>
              <h3 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{h.name}</h3>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{h.tagline}</p>
              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
                {h.stats.map((s) => (
                  <div key={s.label}>
                    <dt className="text-3xl font-semibold tracking-tight">{s.value}</dt>
                    <dd className="mt-1 text-sm text-muted">{s.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      ))}

      {/* Big stats band */}
      <section className="reveal bg-surface/40 px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-10 text-center sm:grid-cols-2 lg:grid-cols-4">
          {bigStats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl font-semibold tracking-tight text-accent sm:text-5xl">{s.value}</div>
              <div className="mt-2 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
