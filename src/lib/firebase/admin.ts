import "server-only";

import { applicationDefault, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK (server-only). Privileged Firestore/Auth access used by
 * the /api/admin/* route handlers — it bypasses firestore.rules, so it must
 * NEVER be imported from a client component (the `server-only` import makes the
 * build fail if it is).
 *
 * Credentials come from Application Default Credentials (ADC):
 *  - In production (App Hosting) the backend runs as a service account, so
 *    `applicationDefault()` resolves automatically — no secret needed.
 *  - Locally, set GOOGLE_APPLICATION_CREDENTIALS to a service-account key
 *    (gitignored), or run the Firestore emulator.
 */
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
