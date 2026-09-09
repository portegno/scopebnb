import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { withAdmin, can } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type Customer = {
  email: string;
  name: string;
  address?: string;
  bookings: number;
  paidBookings: number;
  totalPaidUsd: number | null; // null when the caller lacks revenue.view
  lastDate: string | null;
};

/**
 * GET /api/admin/customers — customer records built from bookings, grouped by
 * email. Test orders are excluded (not real customers). Total spent is only
 * included for callers with revenue.view. Requires customers.view.
 */
export const GET = withAdmin(async (_req, { identity }) => {
  const seeRevenue = can(identity, "revenue.view");
  const snap = await adminDb.collection("bookings").get();

  const map = new Map<string, Customer>();
  snap.forEach((doc) => {
    const d = doc.data();
    if (d.isTest) return;
    const email = (d.contact?.email || d.payment?.payerEmail || "").toLowerCase();
    if (!email) return;

    const c =
      map.get(email) ??
      ({ email, name: "", bookings: 0, paidBookings: 0, totalPaidUsd: 0, lastDate: null } as Customer);
    c.bookings += 1;
    if (!c.name) c.name = d.contact?.name || d.payment?.payerName || "";
    if (!c.address && typeof d.contact?.address === "string") c.address = d.contact.address;
    if (d.payment) {
      c.paidBookings += 1;
      const amt = typeof d.payment.amountUsd === "number" ? d.payment.amountUsd : 0;
      c.totalPaidUsd = (c.totalPaidUsd ?? 0) + amt;
    }
    if (typeof d.date === "string" && (!c.lastDate || d.date > c.lastDate)) c.lastDate = d.date;
    map.set(email, c);
  });

  let customers = [...map.values()].sort(
    (a, b) => (b.totalPaidUsd ?? 0) - (a.totalPaidUsd ?? 0) || b.bookings - a.bookings,
  );
  if (!seeRevenue) customers = customers.map((c) => ({ ...c, totalPaidUsd: null }));

  return NextResponse.json({ customers });
}, "customers.view");
