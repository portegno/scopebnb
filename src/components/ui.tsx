import type { ReactNode } from "react";
import { CTA } from "@/components/CTA";

export { CTA };

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
