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
  nightTier?: string;
  score?: number;
  maxAltitude?: number;
  darkHours?: number;
  moon?: { illumPct: number; separationDeg: number; phase: string } | null;
  previewImage?: string;
  contact?: { email?: string; name?: string };
  userId?: string;
  status?: BookingStatus;
  createdAt?: { seconds: number } | null;
  statusUpdatedAt?: { seconds: number } | null;
  statusUpdatedBy?: string;
  // Admin workflow: who took the order and who reviewed it.
  assignedTo?: string | null;
  assignedAt?: { seconds: number } | null;
  reviewedBy?: string | null;
  reviewedAt?: { seconds: number } | null;
};
