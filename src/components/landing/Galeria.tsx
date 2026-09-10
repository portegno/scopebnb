import Image from "next/image";
import { Reveal } from "./Reveal";

/**
 * Real targets, shot on this rig.
 *
 * This is the block the whole page is built around: for somebody who
 * photographs, one look at a finished Andromeda says more than every sentence
 * above it. Almost no business gets to make its argument this way; this one
 * produces the evidence as its product.
 *
 * **The capture line is optional and stays empty until it is true.** Hours,
 * filters and frame count are the part an astrophotographer actually reads --
 * "5 hours of narrowband" is a claim about the rig, the sky and the mount all
 * at once -- and they are exactly the numbers that would be easy to invent and
 * impossible for a visitor to check. So the component draws nothing when they
 * are missing, the same rule the proof block follows: a gap does not get filled
 * with something that sounds right.
 */
export type Objetivo = {
  src: string;
  objeto: string;
  /** Catalogue designation, if the target has one. */
  catalogo?: string;
  /** Hours, filter, frames. Left out until somebody who knows fills it in. */
  captura?: string;
  alto?: boolean;
};

export function Galeria({ objetivos }: { objetivos: Objetivo[] }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {objetivos.map((o, i) => (
        <Reveal
          key={o.src}
          delay={i * 90}
          className={o.alto ? "sm:col-span-2" : undefined}
        >
          <figure className="m-0 overflow-hidden rounded-xl border border-hairline">
            <div className={`relative w-full ${o.alto ? "aspect-[16/10]" : "aspect-square"}`}>
              <Image
                src={o.src}
                alt={`${o.objeto}, photographed from the ScopeBnB rig`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 520px"
                className="object-cover"
              />
            </div>
            <figcaption className="flex flex-wrap items-baseline gap-x-2 gap-y-1 bg-surface/80 px-4 py-3">
              <span className="text-sm font-semibold">{o.objeto}</span>
              {o.catalogo ? (
                <span className="font-mono text-[11px] text-muted">{o.catalogo}</span>
              ) : null}
              {/* Nothing here until the numbers are real. */}
              {o.captura ? (
                <span className="basis-full font-mono text-[11px] text-gold-soft">{o.captura}</span>
              ) : null}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
