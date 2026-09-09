import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { listBlocks } from "@/lib/admin/blocks";
import { ymdSpan } from "@/lib/dates";
import { HOLD_MS } from "@/lib/bookings/hold";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/availability — public list of unavailable nights (YYYY-MM-DD):
 * non-cancelled bookings + admin-blocked nights. Dates only, no customer data.
 * Feeds the public booking calendar so it reflects real + simulated occupancy.
 */
export async function GET() {
  const [bookingsSnap, blocks] = await Promise.all([adminDb.collection("bookings").get(), listBlocks()]);

  // An unpaid booking (status "requested") only holds its nights for the payment
  // window (HOLD_MS); after that an abandoned checkout stops blocking the
  // calendar. Paid bookings (confirmed/captured/delivered) always hold theirs.
  const now = Date.now();

  const dates = new Set<string>();
  bookingsSnap.forEach((doc) => {
    const d = doc.data();
    if (typeof d.date !== "string" || d.status === "cancelled" || d.isTest) return; // fake orders never block real nights

    const settled = !!d.payment || d.status !== "requested";
    const createdMs = typeof d.createdAt?.toMillis === "function" ? d.createdAt.toMillis() : 0;
    const withinHold = createdMs > 0 && now - createdMs < HOLD_MS;
    if (!settled && !withinHold) return; // abandoned unpaid request: free the nights

    // Multi-night stays (e.g. the 7-night remote week) block every night in
    // their span, not just the start date.
    const nights = typeof d.nights === "number" && d.nights > 0 ? d.nights : 1;
    for (const day of ymdSpan(d.date, nights)) dates.add(day);
  });
  for (const b of blocks) dates.add(b.date);

  return NextResponse.json({ unavailable: Array.from(dates) });
}
