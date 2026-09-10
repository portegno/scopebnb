import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendBookingConfirmation } from "@/lib/bookings/confirmationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verify the caller's Firebase ID token and return their uid. */
async function uidFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  try {
    return (await adminAuth.verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

/**
 * POST /api/bookings/[id]/confirmation-email — send the confirmation email for
 * one of the caller's own bookings. Called by the booking flow right after a
 * request is saved (request mode). Idempotent: the send is stamped, so repeats
 * are no-ops. Owner-only.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await uidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const bookingId = (id ?? "").trim();
  if (!bookingId) return NextResponse.json({ error: "Missing booking id" }, { status: 400 });

  const snap = await adminDb.collection("bookings").doc(bookingId).get();
  if (!snap.exists) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (snap.data()!.userId !== uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const res = await sendBookingConfirmation(bookingId);
  if (!res.ok) {
    console.error("[booking-email] send failed:", res.error);
    return NextResponse.json({ error: "Could not send confirmation" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
