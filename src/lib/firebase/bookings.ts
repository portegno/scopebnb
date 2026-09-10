"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./client";
import type { CapturePlan } from "@/lib/bookings/types";

/** A booking, as stored in Firestore. Target/framing fields apply to Managed
 *  Imaging only; Remote Control bookings are just a night + price. */
export type BookingInput = {
  product?: "managed" | "remote"; // defaults to "managed"
  // Remote Control plan + span. "week" = 7 consecutive nights at a flat rate.
  remotePlan?: "nightly" | "week";
  nights?: number; // consecutive nights; defaults to 1
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
  totalUsd?: number; // definitive amount to charge (price + add-ons)
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
/**
 * The campaign link this visitor arrived on, if any.
 *
 * Read from the cookie the proxy set when they opened a landing — which may
 * have been weeks ago, from a cold email, on a different day than this booking.
 * That gap is the whole reason the cookie exists: a club takes the idea to a
 * meeting and comes back later, and without this the booking arrives belonging
 * to nobody.
 *
 * **This is the last link in the chain.** The agency knows what it spent
 * chasing each club; the booking is where that spend either paid off or didn't.
 * Without this line, "what did it cost us to get this customer" stays a
 * division — total spend over total sales — which does not say that the spend
 * caused the sale.
 */
function enlaceDeCampania(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)sb_l=([a-z0-9]{4,32})(?:;|$)/);
  return m ? m[1] : null;
}

export async function createBooking(input: BookingInput): Promise<string> {
  if (!db) throw new Error("Firebase is not configured");
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const { product = "managed", ...rest } = input;
  const enlace = enlaceDeCampania();
  const ref = await addDoc(collection(db, "bookings"), {
    ...rest,
    product,
    userId: uid,
    status: "requested",
    createdAt: serverTimestamp(),
    // Only when there is one: a field that is sometimes null and sometimes
    // absent reads the same, and absent is the honest shape for "this person
    // did not come from a campaign".
    ...(enlace ? { enlace } : {}),
  });
  return ref.id;
}
