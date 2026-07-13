"use client";

import { useEffect } from "react";

/**
 * Pins the starfield's rotation pivot — the celestial pole — to the spiral in
 * the header wordmark, so the whole sky wheels around the ScopeBnB logo. Writes
 * the box-relative transform-origin into `--sky-origin` on `.starfield`; the CSS
 * keyframes do the rotation. Re-measures on resize (the logo's pixel position
 * shifts with viewport width inside the centered header container).
 */
export function SkyPole() {
  useEffect(() => {
    const sky = document.querySelector<HTMLElement>(".starfield");
    if (!sky) return;

    // Spiral centre as a fraction of the wordmark viewBox (0 0 197.84 39.04).
    const SPIRAL_FX = 64 / 197.84;
    const SPIRAL_FY = 19.5 / 39.04;

    const place = () => {
      const logo = document.querySelector<SVGElement>("svg.logo-glow-soft");
      if (!logo) return;
      const r = logo.getBoundingClientRect();
      if (!r.width) return;
      // Viewport fraction of the spiral, then map to the oversized (inset:-150%)
      // pseudo-element box: screen fraction f → box-% = 25·f + 37.5.
      const fx = (r.left + SPIRAL_FX * r.width) / window.innerWidth;
      const fy = (r.top + SPIRAL_FY * r.height) / window.innerHeight;
      sky.style.setProperty("--sky-origin", `${(25 * fx + 37.5).toFixed(2)}% ${(25 * fy + 37.5).toFixed(2)}%`);
    };

    place();
    const raf = requestAnimationFrame(place); // re-measure after layout/fonts settle
    window.addEventListener("resize", place, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
    };
  }, []);

  return null;
}
