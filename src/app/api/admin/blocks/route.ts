import { NextResponse } from "next/server";
import { withAdmin, AdminError } from "@/lib/admin/auth";
import { blockNight, isYmd } from "@/lib/admin/blocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/blocks — block a free night. Requires calendar.block. */
export const POST = withAdmin(async (req, { identity }) => {
  const body = (await req.json().catch(() => ({}))) as { date?: unknown; note?: unknown };
  if (!isYmd(body.date)) throw new AdminError(400, "Invalid date");
  // Reject clearly-past nights (1-day grace so timezones don't trip "today").
  const floor = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (body.date < floor) throw new AdminError(400, "Cannot block a past night");
  const note = typeof body.note === "string" ? body.note : "";
  await blockNight(body.date, identity.email, note);
  return NextResponse.json({ block: { date: body.date, blockedBy: identity.email, note } });
}, "calendar.block");
