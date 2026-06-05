"use client";

import { Wordmark } from "./Wordmark";

/**
 * Home hero wordmark: the animated gradient follows the cursor and the whole
 * mark carries a soft colour-cycling glow (.logo-glow).
 */
export function HomeLogo({ className }: { className?: string }) {
  return (
    <Wordmark gradientId="sbGradHome" followMouse className={`logo-glow ${className ?? ""}`} />
  );
}
