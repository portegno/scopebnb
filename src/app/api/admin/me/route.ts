import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/me — the caller's identity + effective permissions, so the
 *  UI can adapt. Any authenticated admin (super admin or a user with a bundle). */
export const GET = withAdmin(async (_req, { identity }) => {
  return NextResponse.json({
    email: identity.email,
    isSuperAdmin: identity.isSuperAdmin,
    permissions: Array.from(identity.permissions),
  });
});
