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
 * Every managed booking delivers the session's light frames plus the matching
 * calibration frames (un-integrated). A fully integrated, ready-to-stretch image
 * (calibrated + stacked + processed) is an optional add-on for this flat fee.
 */
export const INTEGRATION_FEE = 25;

/**
 * Remote Control is sold only as a fixed multi-night package — no single nights.
 * Each package is a flat rate for a block of consecutive nights, independent of
 * the moon (the moon prices managed imaging, not remote). Two options: a short
 * 3-night block and the full week, which is the best value and the one we steer
 * bookers toward. Single source of truth for the plan cards and the booking price.
 */
export type RemotePlanKey = "short" | "week";

export type RemotePlan = {
  key: RemotePlanKey;
  label: string;
  nights: number;
  /** Flat price for the whole block, in USD. */
  price: number;
  popular?: boolean;
};

const REMOTE_PLAN_MAP: Record<RemotePlanKey, RemotePlan> = {
  short: { key: "short", label: "3 nights", nights: 3, price: 150 },
  week: { key: "week", label: "Full week", nights: 7, price: 300, popular: true },
};

export const REMOTE_PLANS: RemotePlan[] = [REMOTE_PLAN_MAP.week, REMOTE_PLAN_MAP.short];

export function remotePlan(key: RemotePlanKey): RemotePlan {
  return REMOTE_PLAN_MAP[key];
}

// Kept for the full-week plan (referenced across the site, schema and landings).
export const REMOTE_WEEK_NIGHTS = REMOTE_PLAN_MAP.week.nights;
export const REMOTE_WEEK_PRICE = REMOTE_PLAN_MAP.week.price;
