import { NextResponse } from "next/server";
import { AdminError, requireAdmin, requirePermission } from "@/lib/admin/auth";
import { deleteAdminUser, upsertAdminUser } from "@/lib/admin/access";
import { isPermission } from "@/lib/admin/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(req: Request) {
  const identity = await requireAdmin(req);
  requirePermission(identity, "team.manage");
}

function handle(e: unknown) {
  if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[admin] team user route error:", e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

/** PATCH /api/admin/team/users/[email] — update a user's permissions. */
export async function PATCH(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    await guard(req);
    const { email } = await params;
    const body = (await req.json().catch(() => ({}))) as { permissions?: unknown[]; displayName?: string };
    const permissions = Array.isArray(body.permissions) ? body.permissions.filter(isPermission) : [];
    await upsertAdminUser(decodeURIComponent(email), permissions, body.displayName);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}

/** DELETE /api/admin/team/users/[email] — remove an admin user. */
export async function DELETE(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {
    await guard(req);
    const { email } = await params;
    await deleteAdminUser(decodeURIComponent(email));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
