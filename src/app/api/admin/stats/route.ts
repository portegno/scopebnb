import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { withAdmin, can } from "@/lib/admin/auth";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookings/status";
import type { Booking } from "@/lib/bookings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toSeconds = (v: unknown) => (v instanceof Timestamp ? { seconds: v.seconds } : null);
const TO_PREPARE: BookingStatus[] = ["requested", "confirmed"];

/**
 * GET /api/admin/stats?from=<ms>&to=<ms> — order metrics over bookings CREATED
 * in range + upcoming sessions to prepare. Requires stats.view. Revenue is
 * omitted, and contact/price stripped, for callers lacking revenue.view /
 * customers.view (server-side). Month occupancy lives at /api/admin/occupancy.
 */
export const GET = withAdmin(async (req, { identity }) => {
  const seeRevenue = can(identity, "revenue.view");
  const seeCustomers = can(identity, "customers.view");

  const url = new URL(req.url);
  const from = Number(url.searchParams.get("from")) || 0;
  const to = Number(url.searchParams.get("to")) || Number.MAX_SAFE_INTEGER;

  const snap = await adminDb.collection("bookings").get();

  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;
  const byProduct = { managed: 0, remote: 0 };
  const byTier: Record<string, number> = {};
  let total = 0;
  let revenueRealized = 0;
  let revenuePipeline = 0;
  let upcomingNights = 0;
  const upcomingSessions: Booking[] = [];

  const today = new Date().toISOString().slice(0, 10);

  snap.forEach((doc) => {
    const d = doc.data();
    const status = (BOOKING_STATUSES.includes(d.status) ? d.status : "requested") as BookingStatus;
    const createdMs = (d.createdAt?.seconds ?? 0) * 1000;
    const inRange = createdMs >= from && createdMs <= to;

    if (inRange) {
      total++;
      byStatus[status]++;
      if (d.product === "remote") byProduct.remote++;
      else byProduct.managed++;
      if (d.nightTier) byTier[d.nightTier] = (byTier[d.nightTier] ?? 0) + 1;
      const price = typeof d.priceUsd === "number" ? d.priceUsd : 0;
      if (status === "captured" || status === "delivered") revenueRealized += price;
      else if (status === "requested" || status === "confirmed") revenuePipeline += price;
    }

    if (typeof d.date === "string" && d.date >= today && status !== "cancelled") {
      upcomingNights++;
      if (TO_PREPARE.includes(status)) {
        const s: Record<string, unknown> = {
          ...d,
          id: doc.id,
          createdAt: toSeconds(d.createdAt),
          statusUpdatedAt: toSeconds(d.statusUpdatedAt),
          assignedAt: toSeconds(d.assignedAt),
          reviewedAt: toSeconds(d.reviewedAt),
        };
        if (!seeCustomers) delete s.contact;
        if (!seeRevenue) delete s.priceUsd;
        upcomingSessions.push(s as Booking);
      }
    }
  });

  upcomingSessions.sort(
    (a, b) => (a.date ?? "").localeCompare(b.date ?? "") || (a.sessionStart ?? 0) - (b.sessionStart ?? 0),
  );

  return NextResponse.json({
    stats: {
      total,
      byStatus,
      byProduct,
      byTier,
      revenue: seeRevenue
        ? { realized: revenueRealized, pipeline: revenuePipeline, total: revenueRealized + revenuePipeline }
        : null,
      upcomingNights,
    },
    upcomingSessions: upcomingSessions.slice(0, 20),
  });
}, "stats.view");
