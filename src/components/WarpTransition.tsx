"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * WARP TRANSITION — adds a brief "space flight" to the starfield on every route
 * change (and initial load). Toggles `.warp` on <html>; the CSS in globals.css
 * (search "WARP TRANSITION") does the zoom/spin. Remove this component from
 * layout.tsx and delete that CSS block to disable.
 */
export function WarpTransition() {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("warp");
    const t = setTimeout(() => el.classList.remove("warp"), 1150);
    return () => {
      clearTimeout(t);
      el.classList.remove("warp");
    };
  }, [pathname]);

  return null;
}
