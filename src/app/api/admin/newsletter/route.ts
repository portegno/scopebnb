import { NextResponse } from "next/server";
import { withAdmin, AdminError } from "@/lib/admin/auth";
import { sendEmail, createAndSendBroadcast, syncAudience } from "@/lib/email/client";
import { newsletterEmail } from "@/lib/email/templates/newsletter";
import { listCampaigns, recordCampaign } from "@/lib/newsletter/campaigns";
import { subscriberCount, listSubscriberEmails } from "@/lib/newsletter/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/newsletter — campaign history + current subscriber count. */
export const GET = withAdmin(async () => {
  const [campaigns, subscribers] = await Promise.all([listCampaigns(), subscriberCount()]);
  return NextResponse.json({ campaigns, subscribers });
}, "newsletter.manage");

/**
 * POST /api/admin/newsletter — compose actions:
 *  - action "test": send the composed email to a single address.
 *  - action "send": create + send a Resend Broadcast to the whole Audience,
 *    and record the campaign.
 *  - action "sync": mirror all Firestore subscribers into the Resend Audience.
 */
export const POST = withAdmin(async (req, { identity }) => {
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    subject?: string;
    previewText?: string;
    contentHtml?: string;
    testEmail?: string;
  };
  const action = body.action ?? "";

  if (action === "sync") {
    const emails = await listSubscriberEmails();
    const result = await syncAudience(emails);
    return NextResponse.json({ ok: true, ...result });
  }

  const subject = (body.subject ?? "").trim();
  const previewText = (body.previewText ?? "").trim();
  const contentHtml = (body.contentHtml ?? "").trim();
  if (!subject) throw new AdminError(400, "Subject is required");
  if (!contentHtml) throw new AdminError(400, "Body is required");

  if (action === "test") {
    const to = (body.testEmail ?? "").trim().toLowerCase();
    if (!to || !to.includes("@")) throw new AdminError(400, "Valid test email required");
    // Placeholder unsubscribe link for the one-off test (the real merge tag only
    // resolves inside a Broadcast).
    const { html } = newsletterEmail(contentHtml, { previewText, unsubscribeUrl: "#" });
    const res = await sendEmail({ to, subject: `[Test] ${subject}`, html });
    if (!res.ok) throw new AdminError(502, `Test send failed: ${res.error}`);
    return NextResponse.json({ ok: true, id: res.id });
  }

  if (action === "send") {
    const { html } = newsletterEmail(contentHtml, { previewText });
    const recipients = await subscriberCount();
    const result = await createAndSendBroadcast({ subject, html, previewText, name: subject });

    const campaign = await recordCampaign({
      subject,
      previewText,
      contentHtml,
      status: result.ok ? "sent" : "failed",
      resendBroadcastId: result.broadcastId ?? null,
      recipientCount: result.ok ? recipients : null,
      authorEmail: identity.email,
      error: result.ok ? null : result.error,
    });

    if (!result.ok) throw new AdminError(502, `Broadcast failed: ${result.error}`);
    return NextResponse.json({ ok: true, campaign });
  }

  throw new AdminError(400, "Unknown action");
}, "newsletter.manage");
