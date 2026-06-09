import "server-only";

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { resolveAccess } from "@/lib/admin/access";
import type { Permission } from "@/lib/admin/permissions";

export type AdminIdentity = {
  uid: string;
  email: string;
  isSuperAdmin: boolean;
  permissions: Set<Permission>;
};

export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Verify the `Authorization: Bearer <idToken>` header and resolve the caller's
 * admin access (super-admin via env, or an adminUsers doc + bundles). Throws
 * AdminError on failure. Authorization is enforced here — the /admin UI is cosmetic.
 */
export async function requireAdmin(req: Request): Promise<AdminIdentity> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new AdminError(401, "Missing auth token");

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw new AdminError(401, "Invalid auth token");
  }

  const email = (decoded.email ?? "").toLowerCase();
  if (!decoded.email_verified || !email) throw new AdminError(403, "Not authorized");

  const access = await resolveAccess(email);
  if (!access) throw new AdminError(403, "Not authorized");

  return { uid: decoded.uid, email, isSuperAdmin: access.isSuperAdmin, permissions: access.permissions };
}

export function can(identity: AdminIdentity, perm: Permission): boolean {
  return identity.isSuperAdmin || identity.permissions.has(perm);
}

export function requirePermission(identity: AdminIdentity, perm: Permission): void {
  if (!can(identity, perm)) throw new AdminError(403, "Forbidden");
}

/**
 * Wrap an admin route handler: verify admin, optionally require a permission,
 * pass the identity to the handler, and map errors to JSON responses.
 */
export function withAdmin(
  handler: (req: Request, ctx: { identity: AdminIdentity }) => Promise<NextResponse>,
  requiredPermission?: Permission,
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const identity = await requireAdmin(req);
      if (requiredPermission) requirePermission(identity, requiredPermission);
      return await handler(req, { identity });
    } catch (e) {
      if (e instanceof AdminError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error("[admin] route error:", e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
