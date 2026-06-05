"use client";

import { useEffect, useState } from "react";
import { heroImages } from "@/data/heroImages";

/**
 * Full-bleed home-hero backdrop that slowly cross-fades through `heroImages`.
 * Pure presentation — the image list lives in @/data/heroImages. Honors
 * prefers-reduced-motion (holds on the first frame) and darkens toward the
 * left/bottom so the headline stays legible over any photo.
 */
export function HeroBackground({ intervalMs = 7000 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (heroImages.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % heroImages.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {heroImages.map((img, i) => {
        const active = i === index;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.src}
            src={img.src}
            alt={active ? img.alt : ""}
            aria-hidden={!active}
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out${
              active ? " hero-kb" : ""
            }`}
            style={{
              opacity: active ? 1 : 0,
              transitionDuration: "1500ms",
              filter: "brightness(1.18) saturate(1.08)",
              // While hidden, hold at the animation's END state so leaving the
              // active slot never snaps the photo smaller. It only resets to the
              // start when it becomes active again (invisible at that instant),
              // where the hero-kb animation restarts from scale(1).
              ...(active ? null : { transform: "scale(1.22) rotate(3deg)" }),
            }}
            onError={(e) => {
              // Missing file (not exported yet) → hide so the dark backdrop
              // shows instead of a broken-image icon.
              e.currentTarget.style.display = "none";
            }}
          />
        );
      })}

      {/* Legibility washes: darken the left (under the headline) and the bottom,
          while letting the nebula stay bright toward the center/right. */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/35 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
    </div>
  );
}
