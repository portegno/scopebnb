import { NextResponse } from "next/server";
import { withAdmin, can } from "@/lib/admin/auth";
import { computeOccupancy } from "@/lib/admin/occupancy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/occupancy?month=YYYY-MM — month occupancy (defaults to current). */
export const GET = withAdmin(async (req, { identity }) => {
  const m = new URL(req.url).searchParams.get("month");
  let year: number;
  let month: number;
  if (m && /^\d{4}-\d{2}$/.test(m)) {
    [year, month] = m.split("-").map(Number);
  } else {
    const now = new Date();
    year = now.getUTCFullYear();
    month = now.getUTCMonth() + 1;
  }
  const occupancy = await computeOccupancy(year, month, {
    seeCustomers: can(identity, "customers.view"),
    seeRevenue: can(identity, "revenue.view"),
  });
  return NextResponse.json({ occupancy });
}, "stats.view");
