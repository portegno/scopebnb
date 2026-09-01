"use client";

import { useEffect, useState } from "react";

/**
 * Renders a blog post's cover + body (injected HTML) and makes every image
 * click-to-zoom: clicking opens a full-screen lightbox, click anywhere or Esc
 * closes it. Body images come from `dangerouslySetInnerHTML`, so zooming is
 * wired with a single delegated click handler on the container.
 */
export function ArticleContent({
  coverImage,
  contentClassName,
  contentHtml,
}: {
  coverImage?: string;
  contentClassName: string;
  contentHtml: string;
}) {
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoom]);

  // Delegated: zoom when an <img> inside the body is clicked (and stop a wrapping
  // link from navigating).
  function onBodyClick(e: React.MouseEvent) {
    const t = e.target;
    if (t instanceof HTMLImageElement) {
      e.preventDefault();
      setZoom(t.currentSrc || t.src);
    }
  }

  return (
    <>
      {coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt=""
          onClick={() => setZoom(coverImage)}
          className="mt-8 w-full cursor-zoom-in rounded-[4px] ring-1 ring-hairline"
        />
      )}

      <div
        className={`${contentClassName} [&_img]:cursor-zoom-in`}
        onClick={onBodyClick}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {zoom && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setZoom(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-zoom-out rounded-[4px] ring-1 ring-white/10"
          />
        </div>
      )}
    </>
  );
}
