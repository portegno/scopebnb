import type { BookingStatus } from "./status";

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
