import type { BookingStatus } from "./status";

/** Which of the rig's two filter states a sub-set is shot through. The OSC
 *  camera means there is no LRGB/SHO — only clear (broadband colour) or the
 *  Optolong L-Extreme dual narrowband. See data/equipment.ts → captureFilters. */
export type CaptureFilterKey = "clear" | "lextreme";

/** Desired subs for one filter state. Counts are a target: we image the whole
 *  imageable window, so this expresses how the night should be split. */
export type CaptureFilterPlan = {
  key: CaptureFilterKey;
  enabled: boolean;
  subSeconds: number; // exposure per sub
  subs: number; // desired number of subs
};

/** The user's managed-session capture plan: per-filter targets + team notes.
 *  When `autoManaged` is true the user delegated the filter/exposure choice to
 *  the ScopeBnB team (the advanced controls were never opened); `filters` then
 *  carries the AI/default seed only as a starting point for staff. */
export type CapturePlan = {
  filters: CaptureFilterPlan[];
  notes?: string;
  autoManaged?: boolean;
};

/**
 * A booking as stored in Firestore and serialized to the client (createdAt /
 * statusUpdatedAt are reduced to `{ seconds }`). Shared by the user dashboard
 * and the admin order views. Plain data — no Firebase imports.
 */
export type Booking = {
  id: string;
  product?: "managed" | "remote";
  // Remote Control plan: a single night or a 7-night week (flat rate).
  remotePlan?: "nightly" | "week";
  // Number of consecutive nights the booking spans (1 for a single night, 7 for
  // the remote week). Absent means 1.
  nights?: number;
  targetName?: string;
  ra?: number;
  dec?: number;
  rotation?: number;
  mosaic?: { cols: number; rows: number; overlap: number; panels: { ra: number; dec: number }[] } | null;
  date?: string;
  capturePlan?: CapturePlan | null;
  // Managed add-on: deliver a fully integrated image, not just lights + calibration.
  wantsIntegration?: boolean;
  sessionStart?: number;
  sessionEnd?: number;
  durationHours?: number;
  priceUsd?: number;
  // Price before any discount (night/week price + add-ons). Kept so the server
  // can recompute the charge from a trusted base when a discount is applied.
  subtotalUsd?: number;
  // Newsletter first-session discount applied to this booking, if any. The
  // server re-validates the holder's right to it before charging.
  discount?: { code: string; percent: number; amountUsd: number } | null;
  // The definitive amount to charge (subtotal minus any discount). Set at
  // booking time so payment never has to recompute it.
  totalUsd?: number;
  nightTier?: string;
  score?: number;
  maxAltitude?: number;
  darkHours?: number;
  moon?: { illumPct: number; separationDeg: number; phase: string } | null;
  previewImage?: string;
  contact?: { email?: string; name?: string };
  userId?: string;
  status?: BookingStatus;
  // Admin-only flag: a test/fake order, excluded from business metrics,
  // occupancy and availability so it never affects real numbers or the calendar.
  isTest?: boolean;
  // Payment (PayPal). Set server-side after a successful capture.
  payment?: {
    provider: "paypal";
    orderId: string;
    captureId: string;
    amountUsd: number;
    payerEmail?: string;
    payerName?: string;
    feeUsd?: number; // PayPal fee
    netUsd?: number; // amount after fee
  } | null;
  paidAt?: { seconds: number } | null;
  // Set once the booking-confirmation email has been sent, so it's never sent
  // twice (client request + payment capture both try).
  confirmationEmailSentAt?: { seconds: number } | null;
  // Set once a session is captured/delivered: id of its client-facing session
  // report (see src/data/sessions.ts → /report/[id]).
  reportId?: string;
  createdAt?: { seconds: number } | null;
  statusUpdatedAt?: { seconds: number } | null;
  statusUpdatedBy?: string;
  // Admin workflow: who took the order and who reviewed it.
  assignedTo?: string | null;
  assignedAt?: { seconds: number } | null;
  reviewedBy?: string | null;
  reviewedAt?: { seconds: number } | null;
};
