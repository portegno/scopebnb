"use client";

import { useEffect, useRef, useState } from "react";
import { heroImages } from "@/data/heroImages";

/**
 * Full-bleed home-hero backdrop that slowly cross-fades through `heroImages`,
 * each one drifting (monotonic Ken-Burns zoom + rotation) the whole time it's
 * on screen. Pure presentation — the image list lives in @/data/heroImages.
 *
 * The cross-fade is a plain opacity transition on PERSISTENT <img> elements
 * (stable keys), so each photo fades in/out smoothly. To restart the drift on
 * the photo that just became active (so it grows from scale 1) we reset its
 * animation imperatively — never remounting — which keeps the fade intact while
 * the outgoing photo keeps its momentum. Honors prefers-reduced-motion.
 */
export function HeroBackground({ intervalMs = 7000 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0);
  const refs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (heroImages.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % heroImages.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [intervalMs]);

  // Restart the Ken-Burns drift on the newly-active photo (back to scale 1)
  // without remounting it — so the opacity cross-fade still runs and the
  // outgoing photo (untouched) keeps drifting through its fade-out.
  useEffect(() => {
    const el = refs.current[index];
    if (!el) return;
    el.style.animation = "none";
    void el.offsetWidth; // reflow so the browser registers the cancel
    el.style.animation = "";
  }, [index]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {heroImages.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          src={img.src}
          alt={i === index ? img.alt : ""}
          aria-hidden={i !== index}
          loading={i === 0 ? "eager" : "lazy"}
          className="hero-kb absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: "1500ms",
            filter: "brightness(1.18) saturate(1.08)",
          }}
          onError={(e) => {
            // Missing file (not exported yet) → hide so the dark backdrop shows
            // instead of a broken-image icon.
            e.currentTarget.style.display = "none";
          }}
        />
      ))}

      {/* Legibility washes: darken the left (under the headline) and the bottom,
          while letting the nebula stay bright toward the center/right. */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
    </div>
  );
}
