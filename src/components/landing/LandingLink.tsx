"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { carriedQuery } from "./campaign";

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
  const target = href.startsWith("/") ? `${href}${carriedQuery(params)}` : href;
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}
