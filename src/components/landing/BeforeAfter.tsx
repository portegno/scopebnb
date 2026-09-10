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

  /**
   * **Por qué no alcanza con onPointerMove.** La primera versión sólo escuchaba
   * el movimiento con el botón apretado, y no andaba: al apretar encima de una
   * imagen el navegador arranca su propio arrastrar-y-soltar, y desde ese
   * momento los eventos de puntero dejan de llegar. El handle se dibujaba, se
   * podía apretar, y no se movía.
   *
   * Se arregla por los dos lados: las imágenes dejan de ser arrastrables y
   * dejan de recibir eventos, y el contenedor **captura el puntero**, que
   * además es lo que hace que siga funcionando cuando el mouse se va del
   * recuadro — al llegar al borde uno sigue moviéndose, y sin captura ahí se
   * corta.
   */
  const arrastrando = useRef(false);

  const alApretar = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    arrastrando.current = true;
    // La captura es una mejora, no el mecanismo: si el navegador la rechaza, el
    // arrastre tiene que seguir andando igual. Colgar el guard de que la
    // captura haya funcionado es hacer que un slider deje de moverse por algo
    // que nadie va a mirar.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* da igual */ }
    mover(e.clientX);
  };

  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastrando.current) return;
    mover(e.clientX);
  };

  const alSoltar = (e: React.PointerEvent<HTMLDivElement>) => {
    arrastrando.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* da igual */ }
  };

  return (
    <figure className="m-0">
      <div
        ref={caja}
        className="relative aspect-[3/2] w-full cursor-ew-resize touch-none overflow-hidden rounded-xl border border-hairline select-none"
        onPointerDown={alApretar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        <Image
          src={a}
          alt={alt}
          fill
          draggable={false}
          sizes="(max-width: 768px) 100vw, 720px"
          className="pointer-events-none object-cover select-none"
        />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${x}%)` }}>
          <Image
            src={b}
            alt=""
            fill
            draggable={false}
            sizes="(max-width: 768px) 100vw, 720px"
            className="pointer-events-none object-cover select-none"
          />
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

      </div>

      {/* El control de verdad, para teclado y para lector de pantalla.
          **Antes era una capa invisible encima de la imagen**, y eso hacía dos
          cosas malas: se comía los clicks de la franja de abajo y no se podía
          ver ni enfocar. Ahora vive debajo, se ve, y el arrastre de arriba es
          el atajo con mouse. */}
      <input
        type="range"
        min={0}
        max={100}
        value={x}
        onChange={(e) => setX(Number(e.target.value))}
        aria-label={`Wipe between ${labelA} and ${labelB}`}
        className="mt-3 w-full cursor-ew-resize accent-gold"
      />
    </figure>
  );
}
