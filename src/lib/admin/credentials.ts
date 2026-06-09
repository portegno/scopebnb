import "server-only";

import { adminAuth } from "@/lib/firebase/admin";

/** Minimum password length we accept when provisioning a team credential. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Create or reset the email+password credential for a team member.
 *
 * Team members are provisioned by a super admin, so the credential is created
 * with `emailVerified: true` — they can sign in immediately at /login with
 * their email and this password (and change it later, either here or via the
 * standard Firebase password-reset flow). Firebase Auth owns the credential;
 * the `adminUsers/{email}` doc owns their permissions (see access.ts).
 *
 * Idempotent: if the email already has a Firebase Auth account (e.g. they
 * signed in with Google before), we set/replace the password on that account
 * instead of failing.
 */
export async function setTeamPassword(email: string, password: string, displayName?: string): Promise<void> {
  const e = email.toLowerCase();
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  try {
    const existing = await adminAuth.getUserByEmail(e);
    await adminAuth.updateUser(existing.uid, {
      password,
      ...(displayName ? { displayName } : {}),
    });
  } catch (err) {
    if ((err as { code?: string }).code === "auth/user-not-found") {
      await adminAuth.createUser({
        email: e,
        password,
        emailVerified: true,
        ...(displayName ? { displayName } : {}),
      });
    } else {
      throw err;
    }
  }
}
