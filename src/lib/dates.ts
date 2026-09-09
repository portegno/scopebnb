/**
 * Small date helpers for YYYY-MM-DD night strings. Pure and UTC-based so they
 * behave the same on the server (availability) and the client (calendar + book
 * flow), independent of the runner's timezone.
 */

/** Add `days` to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** The consecutive nights of a stay: `[start, start+1, …, start+nights-1]`. */
export function ymdSpan(start: string, nights: number): string[] {
  return Array.from({ length: Math.max(1, nights) }, (_, i) => addDaysYmd(start, i));
}
