"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Google Analytics 4 loader. Only rendered when NEXT_PUBLIC_GA_ID is set (see
 * root layout). gtag's `config` sends the first page_view automatically (with
 * the landing URL, so GA4 captures utm_* campaign params); this component then
 * sends a page_view on each client-side route change, which the App Router does
 * without a full reload.
 *
 * **Campaign links whose URL says nothing.** Outbound mail links carry only
 * `?id=code` (the reader shouldn't see they are row seven of a campaign), so
 * the landing leaves `window.__sbCampania` in its HTML and the first page_view
 * goes out with a `page_location` carrying the utm_* params instead. GA4 reads
 * campaign attribution from that field, so the session is attributed to the
 * club and the campaign (medium `outbound`, never `email`, which is the
 * newsletter's) while the address bar stays clean.
 */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  useEffect(() => {
    // Skip the initial run: gtag config already sent that page_view.
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: pathname + window.location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
var c = window.__sbCampania;
if (c && c.fuente) {
  var u = new URL(window.location.href);
  u.searchParams.delete('id');
  u.searchParams.set('utm_source', c.fuente);
  u.searchParams.set('utm_medium', c.medio || 'outbound');
  if (c.campania) u.searchParams.set('utm_campaign', c.campania);
  u.searchParams.set('utm_id', c.codigo);
  gtag('config', '${gaId}', { page_location: u.toString() });
} else {
  gtag('config', '${gaId}');
}`}
      </Script>
    </>
  );
}
