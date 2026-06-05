"use client";

import { useEffect, useState } from "react";
import { heroImages } from "@/data/heroImages";

/**
 * Full-bleed home-hero backdrop that slowly cross-fades through `heroImages`,
 * each one drifting (monotonic Ken-Burns zoom + rotation) the whole time it's
 * on screen. Pure presentation — the image list lives in @/data/heroImages.
 *
 * Momentum through the fade: the drift is a one-shot CSS animation (`.hero-kb`)
 * that runs longer than a slide's on-screen life, so a photo is still moving
 * while it fades out. We restart the drift only on the photo that JUST became
 * active by remounting it (bumping its key) — at that instant it's at opacity 0,
 * so the reset is invisible, and the outgoing photo (key unchanged) keeps its
 * momentum instead of freezing. Honors prefers-reduced-motion.
 */
export function HeroBackground({ intervalMs = 7000 }: { intervalMs?: number }) {
  // `index` = visible photo; `gen` = per-slot remount counter (bumping the
  // incoming slot restarts its drift). Kept in one state to avoid extra renders.
  const [{ index, gen }, setState] = useState<{ index: number; gen: number[] }>(
    () => ({ index: 0, gen: heroImages.map(() => 0) }),
  );

  useEffect(() => {
    if (heroImages.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setState((prev) => {
        const next = (prev.index + 1) % heroImages.length;
        const g = prev.gen.slice();
        g[next] += 1; // remount → restart drift on the incoming photo only
        return { index: next, gen: g };
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      {heroImages.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${i}-${gen[i]}`}
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
