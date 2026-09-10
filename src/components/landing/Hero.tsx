"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { accountName } from "./campaign";

/**
 * The first screen: one real photograph, a promise, one action.
 *
 * **The image is the only heavy thing on the page**, and that's the whole
 * weight budget spent on purpose in the one place it shows. Everything below
 * is CSS. That's how "heavy on design" and "fast" live together instead of
 * being traded against each other.
 *
 * The slow zoom is a `transform: scale` over 24 seconds — cheap, never drops a
 * frame, and it makes a deep-sky frame breathe instead of sitting there like a
 * placeholder. It stops under `prefers-reduced-motion` (see globals.css).
 */
export function Hero({
  eyebrow,
  club: clubDelServidor = null,
  title,
  sub,
  image,
  imageAlt,
  children,
}: {
  eyebrow: string;
  /** The club's real name, already resolved from the link code on the server. */
  club?: string | null;
  title: React.ReactNode;
  sub: string;
  image: string;
  imageAlt: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  // Who we wrote to. The name comes from the server when the link carried a
  // code — that way it is in the HTML, spelled the way the club spells it, and
  // there is no moment where the page says "For astronomy clubs" and then
  // swaps.
  //
  // The `utm_source` fallback stays for the links that already went out before
  // codes existed. Those are real emails in real inboxes and they don't get to
  // be reissued; it un-slugs the name, which is worse but readable.
  //
  // We print the name and nothing more. "For Volkssternwarte Kempten e.V." is
  // true; pretending to know what they were looking for is a lie that reads
  // like one.
  const club = clubDelServidor ?? accountName(params.get("utm_source"));

  return (
    <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
      <div className="lp-kenburns absolute inset-0 -z-10">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>
      {/* The photo has to stay a photo and the text has to stay readable: a
          gradient, not a flat scrim over the whole frame. */}
      <div className="lp-scrim absolute inset-0 -z-10" />

      <div className="mx-auto w-full max-w-5xl px-6 pb-16 sm:pb-24">
        <p className="mb-4 font-mono text-[11px] tracking-[0.22em] text-gold-soft uppercase">
          {club ? `For ${club}` : eyebrow}
        </p>
        <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold text-balance sm:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted sm:text-lg">
          {sub}
        </p>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}
