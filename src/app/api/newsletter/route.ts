import { NextResponse } from "next/server";
import { subscribe, isValidEmail } from "@/lib/newsletter/store";
import { sendEmail, addToAudience } from "@/lib/email/client";
import { welcomeEmail } from "@/lib/email/templates/welcome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/newsletter — subscribe an email to the newsletter and return the
 * first-session discount code. Writes to Firestore via the Admin SDK; the
 * collection is not exposed to client rules, so all access goes through here.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; source?: string };
  const email = (body.email ?? "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source : "site";
  const result = await subscribe(email, source);

  // On a brand-new subscription, send the welcome email with the code and mirror
  // the contact into the Resend Audience for future broadcasts. Both are
  // best-effort: they never throw, so a mail hiccup can't fail the signup. We
  // still await so serverless doesn't tear the function down mid-send.
  if (result.created) {
    const { subject, html, text } = welcomeEmail();
    const [send] = await Promise.allSettled([
      sendEmail({ to: email, subject, html, text }),
      addToAudience(email),
    ]);
    if (send.status === "fulfilled") {
      console.log("[newsletter] welcome send:", email, JSON.stringify(send.value));
    } else {
      console.error("[newsletter] welcome send rejected:", email, send.reason);
    }
  }

  return NextResponse.json({
    ok: true,
    alreadySubscribed: !result.created,
    code: result.code,
    percent: result.percent,
  });
}
