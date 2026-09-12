/**
 * The newsletter perk: a flat percentage off the subscriber's first session,
 * redeemable with this code at checkout. Single source of truth for both the
 * server (validation/redemption) and the client (signup + checkout copy), so
 * the number never drifts between them.
 *
 * Client-safe on purpose (no server-only imports): the percent and code are
 * public — they're shown on the site — so UI components import them directly.
 */
export const NEWSLETTER_DISCOUNT_PERCENT = 5;
export const NEWSLETTER_DISCOUNT_CODE = "FIRSTLIGHT5";
/**
 * Codes still honored at checkout but no longer handed out — subscribers who
 * already received an older code can still redeem it. Keep old codes here when
 * the current one changes so nobody is left holding a dead code.
 */
export const LEGACY_DISCOUNT_CODES = ["FIRSTLIGHT10"];
