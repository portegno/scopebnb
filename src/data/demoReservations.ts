/**
 * DEMO ONLY — pretend some upcoming nights are already booked.
 *
 * Separated from the UI on purpose: swap this out for a real Firestore query
 * (bookings for the listing → set of YYYY-MM-DD) without touching the calendar.
 * Deterministic (no Math.random at runtime) so SSR/CSR stay in sync.
 */

/** Scattered day-offsets from "today" that look randomly taken. */
const RESERVED_OFFSETS = [3, 4, 9, 13, 14, 20, 26, 27, 33, 40, 45];

function toYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Set of booked nights (YYYY-MM-DD) starting from the given local "today". */
export function demoReservedNights(today: string): Set<string> {
  const base = new Date(`${today}T12:00:00Z`);
  const set = new Set<string>();
  for (const offset of RESERVED_OFFSETS) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + offset);
    set.add(toYmd(d));
  }
  return set;
}
