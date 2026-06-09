import { NextResponse } from "next/server";
import { AdminError, requireAdmin, requirePermission } from "@/lib/admin/auth";
import { isYmd, unblockNight, updateBlockNote } from "@/lib/admin/blocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(req: Request) {
  const identity = await requireAdmin(req);
  requirePermission(identity, "calendar.block");
}

function handle(e: unknown) {
  if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[admin] block route error:", e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

/** PATCH /api/admin/blocks/[date] — edit the block note. */
export async function PATCH(req: Request, { params }: { params: Promise<{ date: string }> }) {
  try {
    await guard(req);
    const { date } = await params;
    if (!isYmd(date)) throw new AdminError(400, "Invalid date");
    const body = (await req.json().catch(() => ({}))) as { note?: unknown };
    await updateBlockNote(date, typeof body.note === "string" ? body.note : "");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}

/** DELETE /api/admin/blocks/[date] — unblock a night. */
export async function DELETE(req: Request, { params }: { params: Promise<{ date: string }> }) {
  try {
    await guard(req);
    const { date } = await params;
    if (!isYmd(date)) throw new AdminError(400, "Invalid date");
    const today = new Date().toISOString().slice(0, 10);
    if (date <= today) throw new AdminError(400, "Cannot unblock a past or current night");
    await unblockNight(date);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
