import { Reveal } from "./Reveal";

/**
 * The shared furniture of a landing. Deliberately few pieces: this is the
 * hand-built pass that the block vocabulary gets carved out of, so anything
 * that shows up here twice is a candidate for a block, and anything that shows
 * up once probably isn't one.
 */

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-5xl px-6 py-20 sm:py-28 ${className}`}>
      {children}
    </section>
  );
}

export function Title({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <Reveal>
      {kicker ? (
        <p className="mb-3 font-mono text-[11px] tracking-[0.22em] text-accent uppercase">{kicker}</p>
      ) : null}
      <h2 className="max-w-2xl text-2xl leading-tight font-semibold text-balance sm:text-4xl">
        {children}
      </h2>
    </Reveal>
  );
}

export function Lead({ children }: { children: React.ReactNode }) {
  return (
    <Reveal delay={60}>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted">{children}</p>
    </Reveal>
  );
}

/** Three steps. Fewer than three reads thin; more than three isn't read. */
export function Steps({ items }: { items: { n: string; t: string; d: string }[] }) {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-3">
      {items.map((s, i) => (
        <Reveal key={s.n} delay={i * 90}>
          <div className="h-full rounded-xl border border-hairline bg-surface/60 p-6 backdrop-blur-sm">
            <span className="font-mono text-xs text-gold">{s.n}</span>
            <h3 className="mt-3 text-base font-semibold">{s.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/**
 * The questions that stop a club from answering the email.
 *
 * Answering the objection is the whole point: a page that dodges it forces
 * somebody to write and ask, and that email never gets written.
 */
export function Objections({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mt-10 divide-y divide-hairline border-y border-hairline">
      {items.map((o, i) => (
        <Reveal key={o.q} delay={i * 60}>
          <div className="py-5">
            <h3 className="text-sm font-semibold">{o.q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{o.a}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/**
 * Numbers that are facts about the place, not claims about us.
 *
 * There is no testimonial block on either page, and that is not an oversight:
 * the business has one customer. An empty proof section doesn't get filled with
 * something that sounds right — it doesn't get drawn. When there are real
 * testimonials, the block goes in.
 */
export function Facts({ items }: { items: { k: string; v: string }[] }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-4">
      {items.map((f, i) => (
        <Reveal key={f.k} delay={i * 70}>
          <div className="h-full bg-surface/80 p-5 text-center">
            <p className="font-mono text-2xl font-semibold text-gold-soft">{f.v}</p>
            <p className="mt-1 text-[11px] tracking-wide text-muted uppercase">{f.k}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
