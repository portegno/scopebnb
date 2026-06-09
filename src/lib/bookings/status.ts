/**
 * Booking status workflow — single source of truth, shared by the server
 * (API validation) and the client (admin control + dashboard badge).
 * No Firebase imports, so it's safe to use anywhere.
 */
export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "captured",
  "delivered",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as readonly string[]).includes(v);
}

/** Allowed forward transitions for the admin status control. */
export const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["captured", "cancelled"],
  captured: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  captured: "Captured",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Tailwind classes for the status badge, on the dark theme (public site). */
export const STATUS_BADGE_CLASS: Record<BookingStatus, string> = {
  requested: "bg-surface-2 text-muted",
  confirmed: "bg-accent/15 text-accent",
  captured: "bg-gold/15 text-gold-soft",
  delivered: "bg-gold/20 text-gold",
  cancelled: "bg-red-500/15 text-red-300",
};

/** Tailwind classes for the status badge, on the light admin dashboard. */
export const STATUS_BADGE_CLASS_LIGHT: Record<BookingStatus, string> = {
  requested: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  captured: "bg-amber-100 text-amber-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};
