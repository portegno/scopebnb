const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scopebnb.com";

/**
 * Wraps the WYSIWYG newsletter body (HTML from the admin TipTap editor) in an
 * email-safe shell. Light theme on purpose: editor output has no inline colors,
 * so a light background keeps arbitrary body text readable across mail clients,
 * with a dark ScopeBnB header strip for brand. A `<style>` block themes headings,
 * links and images inside the injected body.
 *
 * `unsubscribeUrl` is Resend's merge tag for real broadcasts
 * (`{{{RESEND_UNSUBSCRIBE_URL}}}`, the default) and a harmless placeholder for
 * one-off test sends.
 */
export function newsletterEmail(
  bodyHtml: string,
  opts: { previewText?: string; unsubscribeUrl?: string } = {},
): { html: string } {
  const previewText = opts.previewText ?? "";
  const unsubscribeUrl = opts.unsubscribeUrl ?? "{{{RESEND_UNSUBSCRIBE_URL}}}";

  // An edition written by the Portegno team arrives as a whole document: the
  // agency owns the email engine now, because building an email that does not
  // break is craft and it is the same craft for every business. What stays here
  // is what is ours: the sending account, the domain, and how this provider
  // spells an unsubscribe link.
  //
  // Wrapping it again would nest a full `<html>` inside another one, which some
  // clients render and others silently drop.
  if (/^\s*<(!doctype|html)/i.test(bodyHtml)) {
    return { html: bodyHtml.replaceAll("{{UNSUBSCRIBE}}", unsubscribeUrl) };
  }

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      .nl-body { color:#1a2036; font-size:16px; line-height:1.65; }
      .nl-body h1 { font-size:24px; line-height:1.25; margin:24px 0 8px; color:#0b0f1d; }
      .nl-body h2 { font-size:20px; line-height:1.3; margin:22px 0 8px; color:#0b0f1d; }
      .nl-body h3 { font-size:17px; margin:18px 0 6px; color:#0b0f1d; }
      .nl-body p { margin:0 0 14px; }
      /* Un titulo no es un link aunque se pueda clickear. Pintados de azul y
         subrayados como los demas, el mail se lee como una pagina de 1998: el
         ojo ve seis links y ningun titular. Se quedan del color del texto y el
         subrayado aparece recien al pasar por encima. */
      .nl-body a { color:#1d4ed8; text-decoration:underline; }
      .nl-body h1 a, .nl-body h2 a, .nl-body h3 a { color:#0b0f1d; text-decoration:none; }
      .nl-body h1 a:hover, .nl-body h2 a:hover, .nl-body h3 a:hover { text-decoration:underline; }
      .nl-body img { max-width:100%; height:auto; border-radius:4px; margin:12px 0; }
      .nl-body ul, .nl-body ol { margin:0 0 14px 20px; padding:0; }
      .nl-body blockquote { margin:14px 0; padding:8px 16px; border-left:3px solid #cbd5e1; color:#475569; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef1f7;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#05070f;padding:20px 28px;font-family:Arial,Helvetica,sans-serif;">
                <span style="font-size:18px;font-weight:bold;letter-spacing:0.5px;color:#e8ebf5;">ScopeBnB</span>
              </td>
            </tr>
            <tr>
              <td class="nl-body" style="padding:28px;font-family:Arial,Helvetica,sans-serif;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                  You are receiving this because you subscribed at ${SITE_URL}.
                  <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
