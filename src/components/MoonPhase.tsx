/**
 * A tiny moon-phase glyph. Purely informational: it draws the real illuminated
 * shape of the Moon for a given night, nothing about price or imaging quality.
 *
 * Colours come from `currentColor` (lit limb) so the icon adapts to whatever it
 * sits on: the unlit disc is the same colour at low opacity, with a faint ring
 * so a near-new moon still reads as a disc.
 *
 * `fraction` is the illuminated fraction (0 = new, 1 = full). `waxing` puts the
 * lit limb on the right (northern-hemisphere convention); waning mirrors it.
 */
export function MoonPhase({
  fraction,
  waxing,
  size = 12,
  className,
  title,
}: {
  fraction: number;
  waxing: boolean;
  size?: number;
  className?: string;
  title?: string;
}) {
  const f = Math.min(1, Math.max(0, fraction));
  const r = 10; // work in a 24-unit viewBox, disc radius 10
  const cx = 12;
  const cy = 12;
  // Terminator ellipse half-width, signed: +r at new, -r at full, 0 at quarter.
  const b = r * (1 - 2 * f);
  // Lit area, built with the lit limb on the right; mirror for a waning moon.
  // Outer arc = right semicircle (top -> bottom, sweep 1 = right limb). Inner arc
  // = terminator half-ellipse (bottom -> top): sweep 0 bulges it right (crescent,
  // b>0, thin sliver on the limb), sweep 1 bulges it left (gibbous, b<0, mostly
  // lit with a thin dark crescent on the far side). At b=0 it's the diameter.
  const top = `${cx} ${cy - r}`;
  const bot = `${cx} ${cy + r}`;
  const litPath = `M ${top} A ${r} ${r} 0 0 1 ${bot} A ${Math.abs(b).toFixed(2)} ${r} 0 0 ${b >= 0 ? 0 : 1} ${top} Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {/* Unlit disc + faint ring so the full outline always reads. */}
      <circle cx={cx} cy={cy} r={r} fill="currentColor" opacity={0.16} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={1} opacity={0.3} />
      {/* Illuminated limb. */}
      {f > 0.01 && (
        <path
          d={litPath}
          fill="currentColor"
          opacity={0.9}
          transform={waxing ? undefined : `translate(${2 * cx} 0) scale(-1 1)`}
        />
      )}
    </svg>
  );
}
