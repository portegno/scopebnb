"use client";

import { useEffect, useRef } from "react";

/**
 * Two star layers that drift at different speeds as you scroll.
 *
 * **This is the one place parallax isn't decoration.** The sky genuinely has
 * depth: the far stars and the near ones are not at the same distance, and
 * moving them apart reproduces something that is true. In any other industry
 * this effect is a flourish; here it is the subject.
 *
 * Three things keep it from being the usual janky parallax:
 *
 *   · it only writes `transform`, inside a rAF, off a passive scroll listener;
 *   · it does nothing at all on a touch screen — scroll-linked movement fights
 *     the native scroll on a phone and feels broken, so it degrades to a still
 *     field, which is what the sky looks like anyway;
 *   · it does nothing under `prefers-reduced-motion`. That's not politeness:
 *     parallax makes some people genuinely nauseous, and whoever writes the
 *     effect doesn't have the setting on, so they never see it fail.
 */
export function SkyParallax() {
  const far = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const quieto =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (quieto) return;

    let pedido = 0;
    const mover = () => {
      pedido = 0;
      const y = window.scrollY;
      if (far.current) far.current.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
      if (near.current) near.current.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
    };
    const onScroll = () => {
      if (!pedido) pedido = requestAnimationFrame(mover);
    };

    mover();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden" aria-hidden>
      <div ref={far} className="lp-stars lp-stars--far" />
      <div ref={near} className="lp-stars lp-stars--near" />
    </div>
  );
}
