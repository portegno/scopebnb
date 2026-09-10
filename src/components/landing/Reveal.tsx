"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades a section in when it scrolls into view.
 *
 * **The content is visible without JavaScript.** The hidden state is applied by
 * the effect, not by the server render, so if the bundle never loads or the
 * observer never fires, the page reads exactly as it should — just without the
 * fade. A reveal that starts at `opacity: 0` in the markup is a page that goes
 * blank when one script fails, and nobody finds out from a log.
 *
 * Only `opacity` and `transform` move: anything that animates layout stutters
 * on a mid-range phone, and whoever tests it on a laptop never sees it.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Someone who asked for less motion gets the content, immediately, always.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const node = ref.current;
    if (!node) return;
    setArmed(true);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      // A little before it reaches the fold, so it has finished arriving by the
      // time it is actually being read.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={
        armed
          ? {
              opacity: shown ? 1 : 0,
              transform: shown ? "none" : "translate3d(0, 18px, 0)",
              transition: `opacity .7s cubic-bezier(.22,.61,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,.61,.36,1) ${delay}ms`,
              willChange: shown ? undefined : "opacity, transform",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
