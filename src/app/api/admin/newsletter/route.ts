import { NextResponse } from "next/server";
import { withAdmin, AdminError } from "@/lib/admin/auth";
import { sendEmail, createAndSendBroadcast, syncAudience } from "@/lib/email/client";
import { newsletterEmail } from "@/lib/email/templates/newsletter";
import { listCampaigns, listDrafts, dropDraft, recordCampaign } from "@/lib/newsletter/campaigns";
import { subscriberCount, listSubscriberEmails } from "@/lib/newsletter/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/newsletter — campaign history, drafts waiting, and the current
 * subscriber count. Drafts are editions the Portegno team already wrote: they
 * load into the composer, they are not sent by anyone but a person here.
 */
export const GET = withAdmin(async () => {
  const [campaigns, drafts, subscribers] = await Promise.all([
    listCampaigns(),
    listDrafts(),
    subscriberCount(),
  ]);
  return NextResponse.json({ campaigns, drafts, subscribers });
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
    draftId?: string;
  };
  const action = body.action ?? "";

  // Throwing away a draft the team wrote is a decision, and it needs to be
  // possible: without it a draft you do not like sits there forever and the next
  // one stacks under it. It is not history either, so nothing is kept.
  if (action === "discard") {
    const id = (body.draftId ?? "").trim();
    if (!id) throw new AdminError(400, "Which draft?");
    await dropDraft(id);
    return NextResponse.json({ ok: true });
  }

  // What the subscriber will actually see. The team writes real email HTML
  // (tables, inline styles) and the composer would flatten it: TipTap parses
  // against its own schema and drops everything it does not know. So a team
  // edition is previewed and sent as it is, never loaded into the editor.
  if (action === "preview") {
    const drafts = await listDrafts();
    const d = drafts.find((x) => x.id === (body.draftId ?? "").trim());
    if (!d) throw new AdminError(404, "No such draft");
    const { html } = newsletterEmail(d.contentHtml, { previewText: d.previewText, unsubscribeUrl: "#" });
    return NextResponse.json({ ok: true, html, subject: d.subject });
  }

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
    // The draft is dropped once it went out: keeping both would show the same
    // edition twice, once as waiting and once as sent.
    if (body.draftId) await dropDraft(body.draftId).catch(() => {});
    return NextResponse.json({ ok: true, campaign });
  }

  throw new AdminError(400, "Unknown action");
}, "newsletter.manage");
