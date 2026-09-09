"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { fmtPrice } from "@/lib/pricing";

type PayPalButtonsInstance = { render: (el: HTMLElement) => void };
type PayPalNamespace = { Buttons: (opts: Record<string, unknown>) => PayPalButtonsInstance };
declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth?.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

/**
 * PayPal Smart Buttons for paying a booking. Renders the official buttons; the
 * order and capture both go through our own server routes (which read the price
 * from the booking and verify the capture), so the amount can't be tampered
 * with. Calls `onPaid` once the server confirms the capture.
 */
export function PayPalButton({
  bookingId,
  amountUsd,
  onPaid,
}: {
  bookingId: string;
  amountUsd: number;
  onPaid: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [sdkReady, setSdkReady] = useState(typeof window !== "undefined" && !!window.paypal);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sdkReady || rendered.current || !containerRef.current || !window.paypal) return;
    rendered.current = true;
    window.paypal
      .Buttons({
        style: { color: "gold", shape: "rect", label: "paypal", height: 44 },
        createOrder: async () => {
          setError(null);
          const res = await fetch("/api/paypal/order", {
            method: "POST",
            headers: await authHeader(),
            body: JSON.stringify({ bookingId }),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(d.error || "Could not start payment");
          return d.orderId as string;
        },
        onApprove: async (data: { orderID: string }) => {
          const res = await fetch("/api/paypal/capture", {
            method: "POST",
            headers: await authHeader(),
            body: JSON.stringify({ bookingId, orderId: data.orderID }),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(d.error || "Payment could not be confirmed");
            return;
          }
          onPaid();
        },
        onError: () => setError("Payment error. Please try again."),
      })
      .render(containerRef.current);
  }, [sdkReady, bookingId, onPaid]);

  if (!CLIENT_ID) {
    return <p className="text-sm text-muted">Online payment is not configured yet.</p>;
  }

  return (
    <div>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=USD&intent=capture`}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />
      <div ref={containerRef} />
      <p className="mt-2 text-xs text-muted">Secure payment via PayPal · {fmtPrice(amountUsd)}</p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
