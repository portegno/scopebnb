import Link from "next/link";
import type { ReactNode } from "react";

/** A vertically padded page section with a centered max-width container. */
export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`px-6 py-16 sm:py-20 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** Small uppercase label that sits above a section heading. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
      {children}
    </span>
  );
}

/** Primary / secondary call-to-action link. */
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
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

/** Elevated surface card. */
export function Card({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={`rounded-[4px] bg-surface p-6 ring-1 ring-hairline ${className}`}>
      {children}
    </div>
  );
}

/** Placeholder block for routes whose content is still being defined. */
export function ComingSoon({ note }: { note?: string }) {
  return (
    <div className="rounded-[4px] bg-surface p-10 text-center ring-1 ring-hairline">
      <p className="text-sm font-medium text-muted">
        {note ?? "This page is scaffolded. Content coming next."}
      </p>
    </div>
  );
}
