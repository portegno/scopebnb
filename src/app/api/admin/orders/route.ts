import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { withAdmin, can } from "@/lib/admin/auth";
import type { Booking } from "@/lib/bookings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toSeconds = (v: unknown) => (v instanceof Timestamp ? { seconds: v.seconds } : null);

/** GET /api/admin/orders — every booking, newest first. Requires orders.view.
 *  Customer contact and prices are stripped server-side for callers without
 *  customers.view / revenue.view (not just hidden in the UI). */
export const GET = withAdmin(async (_req, { identity }) => {
  const seeCustomers = can(identity, "customers.view");
  const seeRevenue = can(identity, "revenue.view");

  const snap = await adminDb.collection("bookings").orderBy("createdAt", "desc").get();

  const orders: Booking[] = snap.docs.map((doc) => {
    const d = doc.data();
    const order: Record<string, unknown> = {
      ...d,
      id: doc.id,
      createdAt: toSeconds(d.createdAt),
      statusUpdatedAt: toSeconds(d.statusUpdatedAt),
      assignedAt: toSeconds(d.assignedAt),
      reviewedAt: toSeconds(d.reviewedAt),
    };
    if (!seeCustomers) delete order.contact;
    if (!seeRevenue) delete order.priceUsd;
    return order as Booking;
  });

  return NextResponse.json({ orders });
}, "orders.view");
