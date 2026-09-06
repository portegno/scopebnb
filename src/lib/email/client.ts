import "server-only";

import { Resend } from "resend";

/**
 * Resend email client (server-only). Everything email goes through here so the
 * API key never touches the client bundle.
 *
 * The whole module is env-gated: with no RESEND_API_KEY set, `sendEmail`
 * becomes a logged no-op instead of throwing, so local dev and previews run
 * fine without email configured, and a send failure never breaks the caller
 * (e.g. a newsletter signup still succeeds even if the welcome mail can't go).
 */

let cached: Resend | null | undefined;

function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  cached = key ? new Resend(key) : null;
  return cached;
}

/** Whether email sending is configured (API key present). */
export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const DEFAULT_FROM = "ScopeBnB <onboarding@resend.dev>";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text fallback; recommended for deliverability. */
  text?: string;
  replyTo?: string;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Send one transactional email. Never throws: returns a result object so
 * callers can log-and-continue. A missing API key is treated as a skip.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send:", input.subject);
    return { ok: false, error: "email-not-configured" };
  }

  const from = process.env.NEWSLETTER_FROM || DEFAULT_FROM;
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (error) {
      console.error("[email] send failed:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? "" };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Add a contact to the configured Resend Audience so it's reachable by
 * dashboard Broadcasts. No-op when RESEND_AUDIENCE_ID is unset. Never throws.
 */
export async function addToAudience(email: string): Promise<void> {
  const resend = getResend();
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!resend || !audienceId) return;
  try {
    await resend.contacts.create({ email, audienceId, unsubscribed: false });
  } catch (err) {
    console.error("[email] addToAudience failed:", err);
  }
}

// `syncAudience` and `createAndSendBroadcast` lived here. They went with the
// composer: the newsletter is written, laid out and **sent** from the Portegno
// building now, through its own door to this Resend account. Two places able to
// send the same broadcast is one place too many for something that does not
// come back.
//
// What stays is what the site itself does: the transactional mail above, and
// adding a new subscriber to the audience the moment they sign up.
