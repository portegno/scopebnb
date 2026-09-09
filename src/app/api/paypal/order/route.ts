import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createOrder, paypalConfigured } from "@/lib/paypal/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verify the caller's Firebase ID token and return their uid. */
async function uidFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * POST /api/paypal/order — create a PayPal order for one of the caller's own
 * bookings. The amount comes from the stored booking (never the client), so it
 * can't be tampered with.
 */
export async function POST(req: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  const uid = await uidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { bookingId?: string };
  const bookingId = (body.bookingId ?? "").trim();
  if (!bookingId) return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });

  const snap = await adminDb.collection("bookings").doc(bookingId).get();
  if (!snap.exists) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const b = snap.data()!;
  if (b.userId !== uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (b.payment) return NextResponse.json({ error: "Booking already paid" }, { status: 409 });
  if (b.status === "cancelled") return NextResponse.json({ error: "Booking is cancelled" }, { status: 409 });

  const amountUsd = typeof b.totalUsd === "number" ? b.totalUsd : typeof b.priceUsd === "number" ? b.priceUsd : 0;
  if (!(amountUsd > 0)) return NextResponse.json({ error: "Booking has no amount" }, { status: 409 });

  const product = b.product === "remote" ? "Remote Control" : "Managed Imaging";
  const description = `ScopeBnB ${product} · ${b.remotePlan === "week" ? "7-night week" : b.date ?? "night"}`;

  try {
    const { orderId } = await createOrder({ amountUsd, reference: bookingId, description });
    return NextResponse.json({ orderId });
  } catch (e) {
    console.error("[paypal] order failed:", e);
    return NextResponse.json({ error: "Could not start payment" }, { status: 502 });
  }
}
