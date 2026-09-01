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
gtag('config', '${gaId}');`}
      </Script>
    </>
  );
}
