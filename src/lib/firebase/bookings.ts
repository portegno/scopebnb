"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./client";

/** A managed-imaging booking, as stored in Firestore. */
export type BookingInput = {
  // Target + framing
  targetName: string;
  ra: number;
  dec: number;
  rotation: number;
  previewImage?: string; // sky preview data URL (later: Storage path)
  mosaic?: { cols: number; rows: number; overlap: number; panels: { ra: number; dec: number }[] } | null;
  // Night + session
  date: string; // YYYY-MM-DD
  sessionStart: number; // local hour
  sessionEnd: number;
  durationHours: number;
  // Pricing snapshot (scaled by night tier)
  priceUsd?: number;
  nightTier?: string; // "dark" | "good" | "bright" | "full"
  // Quality snapshot at booking time
  score?: number;
  maxAltitude?: number;
  darkHours?: number;
  moon?: { illumPct: number; separationDeg: number; phase: string } | null;
  // Contact
  contact?: { email?: string; name?: string };
};

/**
 * Persist a managed-imaging booking. Requires Firebase to be configured and
 * the user to be signed in (anonymous auth is fine for MVP).
 */
export async function createBooking(input: BookingInput): Promise<string> {
  if (!db) throw new Error("Firebase is not configured");
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const ref = await addDoc(collection(db, "bookings"), {
    ...input,
    product: "managed",
    userId: uid,
    status: "requested",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
