import "server-only";

/**
 * PayPal Orders v2 (server-side). Money flows through here, so the secret never
 * reaches the browser. Env-gated: with no credentials, `paypalConfigured()` is
 * false and callers should refuse rather than pretend.
 *
 * Env:
 *  - NEXT_PUBLIC_PAYPAL_CLIENT_ID  (also used by the browser SDK)
 *  - PAYPAL_SECRET                 (server only)
 *  - PAYPAL_ENV = "sandbox" | "live"  (default "sandbox")
 */

export function paypalConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
}

function apiBase(): string {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function accessToken(): Promise<string> {
  const id = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET!;
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error_description || "PayPal auth failed");
  }
  return data.access_token as string;
}

/**
 * Create an order for a booking. `reference` (the booking id) is stored on the
 * order so the capture step can tie the payment back to the right booking.
 */
export async function createOrder(input: {
  amountUsd: number;
  reference: string;
  description: string;
}): Promise<{ orderId: string }> {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.reference,
          custom_id: input.reference,
          description: input.description.slice(0, 127),
          amount: { currency_code: "USD", value: input.amountUsd.toFixed(2) },
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.id) throw new Error(data?.message || "PayPal order create failed");
  return { orderId: data.id as string };
}

export type CaptureResult = {
  ok: boolean;
  captureId: string;
  amountUsd: number;
  currency: string;
  reference: string;
  payerEmail?: string;
  payerName?: string;
  feeUsd?: number;
  netUsd?: number;
  status: string;
};

/** Capture an approved order and return the settled details for verification. */
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "PayPal capture failed");

  const unit = data?.purchase_units?.[0];
  const cap = unit?.payments?.captures?.[0];
  const breakdown = cap?.seller_receivable_breakdown;
  const name = data?.payer?.name;
  const payerName = [name?.given_name, name?.surname].filter(Boolean).join(" ") || undefined;
  return {
    ok: data?.status === "COMPLETED" && cap?.status === "COMPLETED",
    captureId: cap?.id ?? "",
    amountUsd: cap?.amount?.value ? Number(cap.amount.value) : 0,
    currency: cap?.amount?.currency_code ?? "",
    reference: unit?.reference_id ?? unit?.custom_id ?? "",
    payerEmail: data?.payer?.email_address,
    payerName,
    feeUsd: breakdown?.paypal_fee?.value ? Number(breakdown.paypal_fee.value) : undefined,
    netUsd: breakdown?.net_amount?.value ? Number(breakdown.net_amount.value) : undefined,
    status: data?.status ?? "",
  };
}
