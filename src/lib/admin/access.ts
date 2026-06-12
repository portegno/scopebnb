import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { PERMISSIONS, isPermission, type Permission } from "@/lib/admin/permissions";

const USERS = "adminUsers";

export type AdminUser = { email: string; permissions: Permission[]; firstName?: string; lastName?: string };

function superAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(email: string): boolean {
  return superAdminEmails().includes(email.toLowerCase());
}

/**
 * Resolve a caller's access. Permissions are assigned directly per user (no
 * bundles). Returns null if not an admin (not a super admin and no adminUsers
 * doc). Super admins implicitly get every permission.
 */
export async function resolveAccess(
  email: string,
): Promise<{ isSuperAdmin: boolean; permissions: Set<Permission> } | null> {
  const e = email.toLowerCase();
  if (isSuperAdmin(e)) return { isSuperAdmin: true, permissions: new Set(PERMISSIONS) };

  const snap = await adminDb.doc(`${USERS}/${e}`).get();
  if (!snap.exists) return null;

  const perms = ((snap.data()?.permissions ?? []) as unknown[]).filter(isPermission);
  return { isSuperAdmin: false, permissions: new Set(perms) };
}

// ---- Admin-user management ----

export async function listAdminUsers(): Promise<AdminUser[]> {
  const snap = await adminDb.collection(USERS).get();
  return snap.docs
    .map((d) => ({
      email: d.data().email ?? d.id,
      permissions: ((d.data().permissions ?? []) as unknown[]).filter(isPermission),
      firstName: d.data().firstName,
      lastName: d.data().lastName,
    }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function upsertAdminUser(
  email: string,
  permissions: Permission[],
  name?: { firstName?: string; lastName?: string },
) {
  const e = email.toLowerCase();
  await adminDb.doc(`${USERS}/${e}`).set(
    {
      email: e,
      permissions,
      ...(name?.firstName ? { firstName: name.firstName } : {}),
      ...(name?.lastName ? { lastName: name.lastName } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteAdminUser(email: string) {
  await adminDb.doc(`${USERS}/${email.toLowerCase()}`).delete();
}
