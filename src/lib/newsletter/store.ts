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

export type DiscountCheck =
  | { valid: true; percent: number; code: string }
  | { valid: false; reason: "wrong-code" | "not-subscribed" | "already-used" };

/**
 * Check whether `email` may redeem `code` for the first-session discount. Valid
 * only when the code matches, the email is on the newsletter list, and the
 * discount hasn't been used yet. Read-only: does not mark it redeemed.
 */
export async function checkDiscount(email: string, code: string): Promise<DiscountCheck> {
  if (code.trim().toUpperCase() !== NEWSLETTER_DISCOUNT_CODE) return { valid: false, reason: "wrong-code" };
  const id = email.trim().toLowerCase();
  const snap = await adminDb.collection(COL).doc(id).get();
  if (!snap.exists) return { valid: false, reason: "not-subscribed" };
  if (snap.data()!.discountRedeemed) return { valid: false, reason: "already-used" };
  return { valid: true, percent: NEWSLETTER_DISCOUNT_PERCENT, code: NEWSLETTER_DISCOUNT_CODE };
}

/**
 * Mark the first-session discount as used for `email`, once. Returns true if it
 * flipped the flag (was unused), false if the email isn't subscribed or the
 * discount was already redeemed. Idempotent, so a repeat call is a safe no-op.
 */
export async function redeemDiscount(email: string): Promise<boolean> {
  const id = email.trim().toLowerCase();
  const ref = adminDb.collection(COL).doc(id);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()!.discountRedeemed) return false;
    tx.update(ref, { discountRedeemed: true, discountRedeemedAt: FieldValue.serverTimestamp() });
    return true;
  });
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
