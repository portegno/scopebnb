/**
 * How long an unpaid booking holds its nights while the user pays — like a
 * cinema seat hold. Single source of truth for the server (availability) and
 * the client (the checkout countdown), so they never drift.
 */
export const HOLD_MINUTES = 10;
export const HOLD_MS = HOLD_MINUTES * 60 * 1000;
