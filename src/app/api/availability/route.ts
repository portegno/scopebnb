import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { listBlocks } from "@/lib/admin/blocks";
import { ymdSpan } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/availability — public list of unavailable nights (YYYY-MM-DD):
 * non-cancelled bookings + admin-blocked nights. Dates only, no customer data.
 * Feeds the public booking calendar so it reflects real + simulated occupancy.
 */
export async function GET() {
  const [bookingsSnap, blocks] = await Promise.all([adminDb.collection("bookings").get(), listBlocks()]);

  const dates = new Set<string>();
  bookingsSnap.forEach((doc) => {
    const d = doc.data();
    if (typeof d.date === "string" && d.status !== "cancelled") {
      // Multi-night stays (e.g. the 7-night remote week) block every night in
      // their span, not just the start date.
      const nights = typeof d.nights === "number" && d.nights > 0 ? d.nights : 1;
      for (const day of ymdSpan(d.date, nights)) dates.add(day);
    }
  });
  for (const b of blocks) dates.add(b.date);

  return NextResponse.json({ unavailable: Array.from(dates) });
}
