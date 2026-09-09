import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { captureOrder, paypalConfigured } from "@/lib/paypal/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
 * POST /api/paypal/capture — capture an approved order and, only if PayPal
 * reports it COMPLETED for the right booking and amount, mark the booking paid
 * and confirmed. The capture is verified server-to-server, so the client can't
 * fake a payment.
 */
export async function POST(req: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 });
  }
  const uid = await uidFromRequest(req);
  if (!uid) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { bookingId?: string; orderId?: string };
  const bookingId = (body.bookingId ?? "").trim();
  const orderId = (body.orderId ?? "").trim();
  if (!bookingId || !orderId) return NextResponse.json({ error: "Missing bookingId or orderId" }, { status: 400 });

  const ref = adminDb.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const b = snap.data()!;
  if (b.userId !== uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (b.payment) return NextResponse.json({ ok: true, alreadyPaid: true }); // idempotent

  const expected = typeof b.totalUsd === "number" ? b.totalUsd : typeof b.priceUsd === "number" ? b.priceUsd : 0;

  let cap;
  try {
    cap = await captureOrder(orderId);
  } catch (e) {
    console.error("[paypal] capture failed:", e);
    return NextResponse.json({ error: "Payment could not be captured" }, { status: 502 });
  }

  // Guard against a mismatched order or a short payment.
  if (!cap.ok) return NextResponse.json({ error: `Payment not completed (${cap.status})` }, { status: 402 });
  if (cap.reference !== bookingId) return NextResponse.json({ error: "Order does not match booking" }, { status: 400 });
  if (cap.amountUsd + 0.01 < expected) {
    return NextResponse.json({ error: "Amount paid is less than the price" }, { status: 400 });
  }

  await ref.update({
    status: "confirmed",
    payment: {
      provider: "paypal",
      orderId,
      captureId: cap.captureId,
      amountUsd: cap.amountUsd,
      payerEmail: cap.payerEmail ?? null,
      payerName: cap.payerName ?? null,
      feeUsd: cap.feeUsd ?? null,
      netUsd: cap.netUsd ?? null,
    },
    paidAt: FieldValue.serverTimestamp(),
    statusUpdatedAt: FieldValue.serverTimestamp(),
    statusUpdatedBy: "paypal",
  });

  return NextResponse.json({ ok: true, amountUsd: cap.amountUsd });
}
