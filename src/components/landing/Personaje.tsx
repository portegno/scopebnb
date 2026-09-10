import Image from "next/image";
import { Reveal } from "./Reveal";

/**
 * The one block on the page with a person in it.
 *
 * Everything else here is sky, gear and numbers, and a page made only of those
 * reads like a rental form for equipment. What a club is actually deciding is
 * whether there is somebody on the other end who will pick up on night one when
 * nothing connects — so the argument for the onboarding call isn't a bullet
 * point, it's a face.
 *
 * Mike is the house character and already appears in the newsletter, so this
 * isn't a new invention for the landing: it's the same brand showing up where
 * the page needs a person. He's plainly an illustration and reads as one, which
 * is the honest version — a stock photo of a smiling stranger would be claiming
 * something about a staff we don't have.
 *
 * The figure floats over the section rather than sitting in a card: it's a
 * cut-out PNG, and boxing a cut-out is how you make it look pasted on.
 */
export function Personaje({
  kicker,
  title,
  children,
  image,
  alt,
  espejo = false,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  image: string;
  alt: string;
  espejo?: boolean;
}) {
  return (
    <div className="relative grid items-center gap-10 sm:grid-cols-2 sm:gap-14">
      <Reveal className={espejo ? "sm:order-2" : undefined}>
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[320px]">
          {/* A soft glow behind the cut-out so it sits in the night instead of
              hovering in front of it. */}
          <div
            aria-hidden
            className="absolute inset-x-4 bottom-6 top-12 rounded-full opacity-70 blur-3xl"
            style={{ background: "radial-gradient(closest-side, rgba(176,124,255,.30), transparent)" }}
          />
          <Image
            src={image}
            alt={alt}
            fill
            sizes="(max-width: 640px) 70vw, 320px"
            className="object-contain"
          />
        </div>
      </Reveal>

      <div className={espejo ? "sm:order-1" : undefined}>
        <Reveal delay={80}>
          <p className="mb-3 font-mono text-[11px] tracking-[0.22em] text-accent uppercase">
            {kicker}
          </p>
          <h2 className="text-2xl leading-tight font-semibold text-balance sm:text-3xl">{title}</h2>
        </Reveal>
        <Reveal delay={140}>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-pretty text-muted">
            {children}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
