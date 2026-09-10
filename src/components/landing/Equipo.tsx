import { Reveal } from "./Reveal";

/**
 * The rig, described by what it can frame.
 *
 * **The landing said nothing about the equipment, and for this audience that
 * is the decision.** The rule Verónica follows is right for a cold email: never
 * list gear, nobody cares until they want to book. On the page the rule flips.
 * Whoever is reading clicked through from that email; they already care, and
 * what they want to know is whether this rig can shoot what theirs cannot.
 *
 * That question came from a real reply. A German club said no because their
 * members already use a remote scope in Spain, and the honest answer to that is
 * not "ours is better" but "ours is a different focal length, so it frames what
 * yours cannot". A second rig is only worth anything if it is a second *kind*
 * of looking.
 *
 * So the headline number is the field of view and not the aperture: 3 degrees
 * across is why Andromeda fills the frame in the picture above, and an imager
 * reads that instantly. The parts list goes underneath, for whoever wants it.
 */
export function Equipo({
  campo,
  escala,
  partes,
}: {
  campo: string;
  escala: string;
  partes: { que: string; cual: string }[];
}) {
  return (
    <>
      <Reveal>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
          <div className="bg-surface/80 p-6">
            <p className="font-mono text-2xl font-semibold text-gold-soft">{campo}</p>
            <p className="mt-1 text-[11px] tracking-wide text-muted uppercase">field of view</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Wide enough that Andromeda fills the frame, which is the picture at the top of this
              page and not a calculation.
            </p>
          </div>
          <div className="bg-surface/80 p-6">
            <p className="font-mono text-2xl font-semibold text-gold-soft">{escala}</p>
            <p className="mt-1 text-[11px] tracking-wide text-muted uppercase">per pixel</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Matched to the seeing here rather than to a spec sheet. Sampling finer than the sky
              allows buys grain, not detail.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <dl className="mt-6 divide-y divide-hairline border-y border-hairline">
          {partes.map((p) => (
            <div key={p.que} className="flex flex-wrap gap-x-4 gap-y-1 py-3">
              <dt className="w-40 shrink-0 text-[11px] tracking-wide text-muted uppercase">
                {p.que}
              </dt>
              <dd className="m-0 flex-1 text-sm">{p.cual}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </>
  );
}
