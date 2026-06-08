"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { scrollToHash } from "@/lib/scrollToHash";

/**
 * Primary / secondary call-to-action link.
 *
 * For in-page anchor hrefs (e.g. "#how-it-works") it scrolls imperatively so a
 * repeat click works even when the URL hash already matches. Off-page links
 * (including "/#how-it-works" from another route) fall through to normal
 * navigation, where the hash scrolls on load.
 */
export function CTA({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base =
    "inline-flex h-11 items-center justify-center rounded-[4px] px-5 text-sm font-semibold transition-colors";
  const styles =
    variant === "primary"
      ? "bg-accent text-background hover:bg-accent/90"
      : "bg-surface-2 text-foreground hover:bg-surface-2/70";
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (scrollToHash(href)) e.preventDefault();
      }}
      className={`${base} ${styles}`}
    >
      {children}
    </Link>
  );
}
