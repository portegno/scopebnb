import type { ReactNode } from "react";

/** Light surface card for the admin dashboard. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[4px] border border-slate-200 bg-white ${className}`}>{children}</div>;
}
