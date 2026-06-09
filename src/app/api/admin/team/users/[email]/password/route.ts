import { NextResponse } from "next/server";
import { AdminError, requireAdmin, requirePermission } from "@/lib/admin/auth";
import { setTeamPassword, MIN_PASSWORD_LENGTH } from "@/lib/admin/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT /api/admin/team/users/[email]/password — set or reset a member's password. */
export async function PUT(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    const identity = await requireAdmin(req);
    requirePermission(identity, "team.manage");

    const { email } = await params;
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AdminError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    await setTeamPassword(decodeURIComponent(email), password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[admin] set password route error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
