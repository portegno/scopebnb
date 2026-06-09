import { NextResponse } from "next/server";
import { withAdmin, AdminError } from "@/lib/admin/auth";
import { listAdminUsers, upsertAdminUser } from "@/lib/admin/access";
import { setTeamPassword, MIN_PASSWORD_LENGTH } from "@/lib/admin/credentials";
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
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    permissions?: unknown[];
    firstName?: string;
    lastName?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new AdminError(400, "Valid email required");
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : undefined;
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : undefined;
  const permissions = Array.isArray(body.permissions) ? body.permissions.filter(isPermission) : [];

  // Provision the email+password credential when given (the user signs in at
  // /login with it). Do this first so a weak/duplicate password fails before we
  // write the permissions doc.
  const password = typeof body.password === "string" ? body.password : "";
  if (password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AdminError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || undefined;
    await setTeamPassword(email, password, displayName);
  }

  await upsertAdminUser(email, permissions, { firstName, lastName });
  return NextResponse.json({ ok: true });
}, "team.manage");
