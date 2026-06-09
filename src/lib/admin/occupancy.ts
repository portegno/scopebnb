import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { listBlocks } from "@/lib/admin/blocks";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/bookings/status";
import { nightTier, type NightTierKey } from "@/lib/pricing";
import { moonIllumination } from "@/lib/visibility";
import { site } from "@/config/site";

export type DaySummary = {
  tier: string;
  bookingId: string;
  status: BookingStatus;
  product?: string;
  targetName?: string;
  customerName?: string;
  priceUsd?: number;
};

export type Occupancy = {
  year: number;
  month: number; // 1-based
  daysInMonth: number;
  days: Record<string, DaySummary>;
  blocks: Record<string, { blockedBy: string; note: string }>;
  tiers: Record<string, NightTierKey>; // day number -> moon/sky quality tier (every day)
  sold: { count: number; pct: number };
  blocked: { count: number; pct: number };
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Occupancy for a given month (1-based). Customer/price are redacted per opts. */
export async function computeOccupancy(
  year: number,
  month: number,
  opts: { seeCustomers: boolean; seeRevenue: boolean },
): Promise<Occupancy> {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${pad(month)}-`;

  const [snap, allBlocks] = await Promise.all([adminDb.collection("bookings").get(), listBlocks()]);

  const days: Record<string, DaySummary> = {};
  snap.forEach((doc) => {
    const d = doc.data();
    const status = (BOOKING_STATUSES.includes(d.status) ? d.status : "requested") as BookingStatus;
    if (status === "cancelled" || typeof d.date !== "string" || !d.date.startsWith(prefix)) return;
    const day = String(parseInt(d.date.slice(8, 10), 10));
    if (days[day]) return;
    const summary: DaySummary = {
      tier: typeof d.nightTier === "string" ? d.nightTier : "occupied",
      bookingId: doc.id,
      status,
      product: d.product,
    };
    if (typeof d.targetName === "string") summary.targetName = d.targetName;
    if (opts.seeCustomers && d.contact?.name) summary.customerName = d.contact.name;
    if (opts.seeRevenue && typeof d.priceUsd === "number") summary.priceUsd = d.priceUsd;
    days[day] = summary;
  });

  const blocks: Record<string, { blockedBy: string; note: string }> = {};
  for (const b of allBlocks) {
    if (b.date.startsWith(prefix)) blocks[String(parseInt(b.date.slice(8, 10), 10))] = { blockedBy: b.blockedBy, note: b.note };
  }

  // Night tier (moon quality) for every day of the month — moon at local midnight.
  const tiers: Record<string, NightTierKey> = {};
  const utcOffset = site.location.utcOffset;
  for (let d = 1; d <= daysInMonth; d++) {
    const ms = Date.UTC(year, month - 1, d, 0, 0, 0, 0) + (24 - utcOffset) * 3_600_000;
    const jd = ms / 86_400_000 + 2_440_587.5;
    tiers[String(d)] = nightTier(moonIllumination(jd).fraction).key;
  }

  const soldCount = Object.keys(days).length;
  const blockedCount = Object.keys(blocks).length;

  return {
    year,
    month,
    daysInMonth,
    days,
    blocks,
    tiers,
    sold: { count: soldCount, pct: Math.round((soldCount / daysInMonth) * 100) },
    blocked: { count: blockedCount, pct: Math.round((blockedCount / daysInMonth) * 100) },
  };
}
