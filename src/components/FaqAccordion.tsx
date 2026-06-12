"use client";

import { useState } from "react";
import type { Faq } from "@/data/faq";

/**
 * FAQ accordion. Single-open: opening one item closes the others. The answer
 * expands/collapses with a smooth height animation via the grid-template-rows
 * 0fr → 1fr trick (animates to content height, no max-height guessing). Server
 * data comes in as `items`.
 */
export function FaqAccordion({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex((cur) => (cur === i ? null : i));

  return (
    <div className="mt-10 space-y-4">
      {items.map((f, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={f.q} className="overflow-hidden rounded-[4px] bg-surface ring-1 ring-hairline transition-colors hover:ring-hairline/80">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 p-6 text-left text-xl font-semibold"
            >
              {f.q}
              <span
                className={`shrink-0 text-2xl leading-none text-accent transition-transform duration-300 ${
                  isOpen ? "rotate-45" : ""
                }`}
              >
                +
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-lg leading-relaxed text-muted">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
