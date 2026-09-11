"use client";

import { useState } from "react";
import { fmtPrice } from "@/lib/pricing";

export type AppliedDiscount = { code: string; percent: number };

const REASON_MESSAGES: Record<string, string> = {
  "wrong-code": "That code isn't valid.",
  "not-subscribed": "This code is for newsletter subscribers. Subscribe with this email to use it.",
  "already-used": "This code has already been used. It's good for your first session only.",
  "not-signed-in": "Please log in to apply a code.",
  "no-email": "Your account has no email to check the code against.",
};

/**
 * Newsletter discount-code field for the checkout. Validates the code against
 * the signed-in user's own email server-side (subscribed + first session), then
 * reports the applied discount to the parent so it can lower the charge. The
 * server re-validates before charging, so this is just the UX layer.
 */
export function DiscountField({
  subtotal,
  discount,
  getIdToken,
  onChange,
}: {
  subtotal: number;
  discount: AppliedDiscount | null;
  getIdToken: () => Promise<string | undefined>;
  onChange: (d: AppliedDiscount | null) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const value = code.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setError(REASON_MESSAGES["not-signed-in"]);
        return;
      }
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: value }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { valid: true; percent: number; code: string }
        | { valid: false; reason: string };
      if (data.valid) {
        onChange({ code: data.code, percent: data.percent });
        setCode("");
      } else {
        setError(REASON_MESSAGES[data.reason] ?? "That code isn't valid.");
      }
    } catch {
      setError("Could not check the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (discount) {
    const amount = Math.round(subtotal * (discount.percent / 100) * 100) / 100;
    return (
      <div className="flex w-full flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
          ✓ {discount.code} · {discount.percent}% off
        </span>
        <span className="text-muted">
          you save {fmtPrice(amount)}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted underline hover:text-foreground"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
          placeholder="Newsletter discount code"
          className="h-9 w-52 rounded-[4px] border border-hairline bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          aria-label="Discount code"
        />
        <button
          type="button"
          onClick={apply}
          disabled={busy || !code.trim()}
          className="h-9 rounded-[4px] border border-hairline px-3 text-sm font-medium text-foreground hover:border-accent disabled:opacity-50"
        >
          {busy ? "Checking…" : "Apply"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
    </div>
  );
}
