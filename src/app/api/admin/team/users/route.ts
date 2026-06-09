import { NextResponse } from "next/server";
import { withAdmin, AdminError } from "@/lib/admin/auth";
import { listAdminUsers, upsertAdminUser } from "@/lib/admin/access";
import { isPermission } from "@/lib/admin/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/team/users — list admin users + their permissions. */
export const GET = withAdmin(async () => {
  const users = await listAdminUsers();
  return NextResponse.json({ users });
}, "team.manage");

/** POST /api/admin/team/users — add a user by email with direct permissions. */
export const POST = withAdmin(async (req) => {
  const body = (await req.json().catch(() => ({}))) as { email?: string; permissions?: unknown[]; displayName?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new AdminError(400, "Valid email required");
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter(isPermission) : [];
  await upsertAdminUser(email, permissions, body.displayName);
  return NextResponse.json({ ok: true });
}, "team.manage");
