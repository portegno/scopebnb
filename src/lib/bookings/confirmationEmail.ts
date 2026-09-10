import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/client";
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
  if (data.confirmationEmailSentAt) return { ok: true, skipped: "already-sent" };

  const to = data.contact?.email as string | undefined;
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
