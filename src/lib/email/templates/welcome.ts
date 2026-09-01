import { NEWSLETTER_DISCOUNT_CODE, NEWSLETTER_DISCOUNT_PERCENT } from "@/lib/newsletter/store";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scopebnb.com";

/**
 * Welcome / confirmation email sent right after someone subscribes to the
 * newsletter. Delivers the first-session discount code. Plain, email-safe HTML
 * with inline styles (no external CSS) so it renders across mail clients.
 */
export function welcomeEmail(): { subject: string; html: string; text: string } {
  const pct = NEWSLETTER_DISCOUNT_PERCENT;
  const code = NEWSLETTER_DISCOUNT_CODE;
  const subject = `Your ${pct}% off code for your first session`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#05070f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070f;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0b0f1d;border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
            <tr>
              <td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ffd591;font-weight:bold;">Welcome to ScopeBnB</p>
                <h1 style="margin:12px 0 0 0;font-size:24px;line-height:1.25;color:#e8ebf5;font-weight:600;">You are in. Clear skies ahead.</h1>
                <p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#9aa3bd;">
                  Thanks for subscribing. Here is your ${pct}% discount for your first session under our Bortle 1 skies in Texas.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;font-family:Arial,Helvetica,sans-serif;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#121830;border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
                  <tr>
                    <td align="center" style="padding:20px;">
                      <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9aa3bd;">Your code</p>
                      <p style="margin:8px 0 0 0;font-family:'Courier New',monospace;font-size:22px;letter-spacing:3px;color:#ffd591;font-weight:bold;">${code}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#9aa3bd;">
                  Apply it at checkout for ${pct}% off your first booked session.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;">
                <a href="${SITE_URL}/book" style="display:inline-block;background:#6ea8fe;color:#05070f;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:4px;">Book a night</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7391;">
                  You are receiving this because you subscribed at ${SITE_URL}. Imaging tips, dark-sky forecasts, and target guides, no spam.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Welcome to ScopeBnB. You are in.`,
    ``,
    `Thanks for subscribing. Here is your ${pct}% discount for your first session:`,
    ``,
    `  ${code}`,
    ``,
    `Apply it at checkout for ${pct}% off your first booked session.`,
    `Book a night: ${SITE_URL}/book`,
    ``,
    `You are receiving this because you subscribed at ${SITE_URL}.`,
  ].join("\n");

  return { subject, html, text };
}
