/**
 * Night pricing — scaled by sky-darkness tier.
 *
 * Moonless ("Dark") nights are the most valuable for deep-sky imaging and the
 * most in demand, so they cost the most; bright/full-moon nights are cheaper.
 * Single source of truth for both the calendar dots and the booking price.
 * Tweak the numbers here — everything downstream follows.
 */
export type NightTierKey = "dark" | "good" | "bright" | "full";

export type NightTier = {
  key: NightTierKey;
  label: string;
  color: string;
  /** Flat price for the whole imageable night, in USD. */
  price: number;
};

const TIERS: Record<NightTierKey, NightTier> = {
  dark: { key: "dark", label: "Dark", color: "#34d399", price: 100 },
  good: { key: "good", label: "Good", color: "#6ea8fe", price: 90 },
  bright: { key: "bright", label: "Bright moon", color: "#e9c46a", price: 75 },
  full: { key: "full", label: "Full moon", color: "#f87171", price: 65 },
};

export const NIGHT_TIERS: NightTier[] = [TIERS.dark, TIERS.good, TIERS.bright, TIERS.full];

/** Map a moon-illumination fraction (0–1) to its pricing/quality tier. */
export function nightTier(illum: number): NightTier {
  if (illum < 0.25) return TIERS.dark;
  if (illum < 0.55) return TIERS.good;
  if (illum < 0.8) return TIERS.bright;
  return TIERS.full;
}

export function fmtPrice(usd: number): string {
  return `$${usd.toLocaleString("en-US")}`;
}

/**
 * Remote Control rents the rig itself (the user drives it), priced 10% above
 * the managed-imaging "we take the photo" rate. Derived so it tracks any change
 * to the base tier prices.
 */
export const REMOTE_SURCHARGE = 1.1;

export function remotePrice(usd: number): number {
  return Math.round(usd * REMOTE_SURCHARGE);
}
