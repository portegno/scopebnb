import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const COL = "newsletterSubscribers";

/**
 * The perk for subscribing: a flat percentage off the subscriber's first
 * session, redeemable with this code at checkout. Single source of truth — the
 * signup UI reads these via /api/newsletter so the copy never drifts.
 */
export const NEWSLETTER_DISCOUNT_PERCENT = 10;
export const NEWSLETTER_DISCOUNT_CODE = "FIRSTLIGHT10";

/** Loose but practical email shape check (server-side gate). */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type SubscribeResult = {
  /** true when this email was not already on the list. */
  created: boolean;
  code: string;
  percent: number;
};

/**
 * Add an email to the newsletter list, idempotently. The doc id is the
 * lowercased email so re-subscribing never creates duplicates; a repeat signup
 * still returns the discount code (created:false) so the UI can re-show it.
 */
export async function subscribe(email: string, source = "site"): Promise<SubscribeResult> {
  const id = email.trim().toLowerCase();
  const ref = adminDb.collection(COL).doc(id);
  const snap = await ref.get();

  if (snap.exists) {
    return { created: false, code: NEWSLETTER_DISCOUNT_CODE, percent: NEWSLETTER_DISCOUNT_PERCENT };
  }

  await ref.set({
    email: id,
    source,
    discountCode: NEWSLETTER_DISCOUNT_CODE,
    discountPercent: NEWSLETTER_DISCOUNT_PERCENT,
    discountRedeemed: false,
    subscribedAt: FieldValue.serverTimestamp(),
  });

  return { created: true, code: NEWSLETTER_DISCOUNT_CODE, percent: NEWSLETTER_DISCOUNT_PERCENT };
}

/** Total number of subscribers on the list. */
export async function subscriberCount(): Promise<number> {
  const snap = await adminDb.collection(COL).count().get();
  return snap.data().count;
}

/** All subscriber emails (source of truth in Firestore), for mirroring to Resend. */
export async function listSubscriberEmails(): Promise<string[]> {
  const snap = await adminDb.collection(COL).get();
  return snap.docs.map((d) => (d.data().email as string) ?? d.id).filter(Boolean);
}
