"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * Two renders of the same frame, with a handle to wipe between them.
 *
 * For someone who photographs, seeing the same data two ways says more than a
 * paragraph about filters ever will. It's the strongest argument this business
 * has and it uses no words.
 *
 * **Both labels have to be true.** The obvious version of this component would
 * be "3-minute sub" against "6-hour stack", which is the comparison that
 * actually sells — and we don't have a stacked image, so we don't make that
 * claim. What we have is one real 180s L-Extreme sub rendered mono and
 * debayered duochrome, and that's what the labels say. Filling this with a
 * better-sounding pair would be inventing proof, which is the one thing this
 * house doesn't do with a number or with a picture.
 */
export function BeforeAfter({
  a,
  b,
  labelA,
  labelB,
  alt,
}: {
  a: string;
  b: string;
  labelA: string;
  labelB: string;
  alt: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(52);

  const mover = (clientX: number) => {
    const r = caja.current?.getBoundingClientRect();
    if (!r?.width) return;
    setX(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <figure className="m-0">
      <div
        ref={caja}
        className="relative aspect-[3/2] w-full touch-pan-y overflow-hidden rounded-xl border border-hairline select-none"
        onPointerMove={(e) => e.buttons === 1 && mover(e.clientX)}
        onPointerDown={(e) => mover(e.clientX)}
      >
        <Image src={a} alt={alt} fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${x}%)` }}>
          <Image src={b} alt="" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
        </div>

        <span className="pointer-events-none absolute top-3 left-3 rounded bg-black/55 px-2 py-1 font-mono text-[10px] tracking-widest text-foreground/90 uppercase">
          {labelA}
        </span>
        <span className="pointer-events-none absolute top-3 right-3 rounded bg-black/55 px-2 py-1 font-mono text-[10px] tracking-widest text-foreground/90 uppercase">
          {labelB}
        </span>

        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
          style={{ left: `${x}%` }}
        >
          <span className="absolute top-1/2 left-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-black/50 text-xs">
            ⇄
          </span>
        </div>

        {/* The real control, for a keyboard and for a screen reader. The wipe
            above is the mouse affordance; this is the one that always works. */}
        <input
          type="range"
          min={0}
          max={100}
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
          aria-label={`Wipe between ${labelA} and ${labelB}`}
          className="absolute inset-x-0 bottom-0 w-full cursor-ew-resize opacity-0"
        />
      </div>
    </figure>
  );
}
