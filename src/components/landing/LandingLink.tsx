"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { conCampania } from "./campaign";

/**
 * An internal link that keeps the campaign parameters.
 *
 * **Use this and never a bare <Link> on a landing.** A CTA that drops the query
 * on the way to /book produces a booking nobody can attribute: the page works,
 * the visitor books, and the campaign that paid for it looks like it did
 * nothing. It is the most expensive way this page can fail and the only one
 * that leaves no trace.
 */
export function LandingLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  // Only internal paths get the query — appending our tracking to somebody
  // else's URL tells them nothing and tells us nothing back.
  //
  // **Merged, not concatenated.** The first version glued the carried query
  // onto the href, which works right up until the href already has one:
  // `/book?mode=remote` came out as `/book?mode=remote?utm_source=…`, and that
  // is not a broken link — it navigates, the page loads, and `mode` quietly
  // becomes "remote?utm_source=…". Two things wrong and neither of them
  // errors. Pricing links to `/book?mode=remote`, so this was one copied href
  // away from happening.
  const target = href.startsWith("/") ? conCampania(href, params) : href;
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
