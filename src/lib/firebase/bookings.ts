"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./client";
import type { CapturePlan } from "@/lib/bookings/types";

/** A booking, as stored in Firestore. Target/framing fields apply to Managed
 *  Imaging only; Remote Control bookings are just a night + price. */
export type BookingInput = {
  product?: "managed" | "remote"; // defaults to "managed"
  // Target + framing (Managed Imaging only)
  targetName?: string;
  ra?: number;
  dec?: number;
  rotation?: number;
  previewImage?: string; // sky preview data URL (later: Storage path)
  mosaic?: { cols: number; rows: number; overlap: number; panels: { ra: number; dec: number }[] } | null;
  // Capture plan: per-filter sub targets + team notes (Managed Imaging only)
  capturePlan?: CapturePlan | null;
  // Add-on: deliver a fully integrated image on top of lights + calibration frames
  wantsIntegration?: boolean;
  // Night + session
  date: string; // YYYY-MM-DD
  sessionStart?: number; // local hour
  sessionEnd?: number;
  durationHours?: number;
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

  const { product = "managed", ...rest } = input;
  const ref = await addDoc(collection(db, "bookings"), {
    ...rest,
    product,
    userId: uid,
    status: "requested",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
