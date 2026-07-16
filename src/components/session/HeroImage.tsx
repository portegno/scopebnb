"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";

type Render = { label: string; src: string; zoomSrc?: string };

/**
 * Report hero with an optional Mono/Color toggle and a click-to-zoom viewer.
 * The inline image stays lightweight (`src`); opening the viewer loads the
 * higher-resolution `zoomSrc` (falls back to `src`). Inside the viewer, click
 * toggles 1x <-> 2.5x zoom and, while zoomed, the pointer pans the frame. Esc
 * or a click on the backdrop closes. When `renders` has 2+ entries, a toggle
 * below the image switches which one is shown (inline and in the viewer).
 */
export function HeroImage({
  src,
  zoomSrc,
  alt,
  renders,
}: {
  src: string;
  zoomSrc?: string;
  alt: string;
  renders?: Render[];
}) {
  const options: Render[] = renders && renders.length >= 2 ? renders : [{ label: "", src, zoomSrc }];
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const closeRef = useRef<HTMLButtonElement>(null);

  const current = options[sel] ?? options[0];
  const full = current.zoomSrc || current.src;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onMove = (e: MouseEvent<HTMLImageElement>) => {
    if (!zoomed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const showToggle = options.length >= 2;

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setZoomed(false); }}
        className="group relative block w-full cursor-zoom-in"
        aria-label={`Zoom into ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.src} alt={alt} className="block w-full" />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-[4px] bg-black/55 px-2 py-1 text-[11px] text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
          Click to zoom
        </span>
      </button>

      {showToggle && (
        <div className="flex items-center gap-1 bg-surface px-4 py-2">
          {options.map((o, i) => (
            <button
              key={o.label || i}
              type="button"
              onClick={() => setSel(i)}
              aria-pressed={i === sel}
              className={`rounded-[4px] px-2.5 py-1 text-xs transition-colors ${
                i === sel ? "bg-surface-2 text-foreground ring-1 ring-hairline" : "text-muted hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-[4px] bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Close
          </button>
          <div className="max-h-full max-w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={full}
              alt={alt}
              onClick={() => setZoomed((z) => !z)}
              onMouseMove={onMove}
              style={{ transform: zoomed ? "scale(2.5)" : "scale(1)", transformOrigin: origin }}
              className={`max-h-[88vh] max-w-full select-none object-contain transition-transform duration-200 ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              draggable={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
