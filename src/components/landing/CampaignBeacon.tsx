"use client";

import { useEffect } from "react";

/**
 * Tells GA4 which campaign this visit came from, without the URL saying so.
 *
 * (Named `CampaignBeacon` and not `Campaign` because `campaign.ts` already sits
 * next to it, and on a case-insensitive filesystem two files differing only in
 * capitalisation are the same file — it compiles on CI and breaks on a Mac.)
 *
 * **This is the half people forget.** Taking the utm parameters out of the
 * address is the right call — they told the reader they were part of a mailing
 * — but GA4's automatic acquisition reads exactly those parameters, so with a
 * clean URL every one of these visits lands in reports as `(direct)`. The
 * campaign disappears from analytics precisely because we hid it from the
 * reader.
 *
 * GA4 doesn't need the URL: it takes the campaign as data. So the source,
 * medium and name are handed over here, resolved server-side from the code.
 *
 * **The contact's email is never sent.** Google's own terms prohibit PII in
 * Analytics — it is the kind of thing properties get shut down for — and these
 * are German clubs, so it is a GDPR question too. The account id goes instead;
 * anything we want to know about the person is joined to that id in our own
 * database, which is where it already lives.
 *
 * One step remains outside this code: `enlace_id` and `cuenta_id` have to be
 * registered as custom dimensions in the GA4 admin. Until then the parameters
 * arrive and are simply not reportable — collected and invisible.
 */
type Gtag = (...args: unknown[]) => void;

export function CampaignBeacon({
  codigo,
  cuenta,
  campania,
  medio,
}: {
  codigo: string;
  cuenta: string;
  campania: string | null;
  medio: string | null;
}) {
  useEffect(() => {
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag !== "function") return;

    // As a user property too, not only on this event: that is what makes the
    // booking three days later still carry the campaign without anything being
    // passed again.
    gtag("set", "user_properties", { enlace_id: codigo, cuenta_id: cuenta });

    gtag("event", "campaign_link", {
      enlace_id: codigo,
      cuenta_id: cuenta,
      campaign_source: cuenta,
      campaign_medium: medio ?? "outbound",
      ...(campania ? { campaign_name: campania } : {}),
    });
  }, [codigo, cuenta, campania, medio]);

  return null;
}
