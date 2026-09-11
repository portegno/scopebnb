import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { sendEmail, addToAudience } from "@/lib/email/client";
import { subscribe } from "@/lib/newsletter/store";
import { bookingConfirmationEmail } from "@/lib/email/templates/booking";
import type { Booking } from "@/lib/bookings/types";

const CONTACT_EMAIL = "contact@scopebnb.com";

export type ConfirmationResult =
  | { ok: true; id: string }
  | { ok: true; skipped: "already-sent" | "no-email" | "email-not-configured" }
  | { ok: false; error: string };

/**
 * Send the booking-confirmation email for one booking, once. Reads the booking
 * server-side (Admin SDK), builds the modality-aware template (managed / remote
 * night / remote week, with Mike's note), sends it, and stamps
 * `confirmationEmailSentAt` so a later trigger (e.g. payment capture) won't
 * re-send. Never throws — returns a result so callers can log-and-continue and a
 * mail hiccup never breaks the booking flow.
 */
export async function sendBookingConfirmation(bookingId: string): Promise<ConfirmationResult> {
  const ref = adminDb.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "not-found" };

  const data = snap.data()!;
  const to = data.contact?.email as string | undefined;

  // Soft opt-in: a customer who books is added to the newsletter. This is legal
  // as a soft opt-in because the checkout shows a notice at booking time and
  // every edition carries an unsubscribe link. Best-effort and idempotent, so
  // it never blocks or double-adds; independent of the confirmation email.
  if (to) {
    try {
      const r = await subscribe(to, "booking");
      if (r.created) await addToAudience(to);
    } catch (e) {
      console.error("[booking-email] newsletter opt-in failed:", e);
    }
  }

  if (data.confirmationEmailSentAt) return { ok: true, skipped: "already-sent" };
  if (!to) return { ok: true, skipped: "no-email" };

  const booking = { id: snap.id, ...data } as Booking;
  const { subject, html, text } = bookingConfirmationEmail(booking);

  const res = await sendEmail({ to, subject, html, text, replyTo: CONTACT_EMAIL });
  if (!res.ok) {
    if (res.error === "email-not-configured") return { ok: true, skipped: "email-not-configured" };
    return { ok: false, error: res.error };
  }

  // Stamp only after a real send so a transient failure can be retried.
  await ref.update({ confirmationEmailSentAt: FieldValue.serverTimestamp() });
  return { ok: true, id: res.id };
}
