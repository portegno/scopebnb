"use client";

import { useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";

/** Amber, bold eyebrow specific to the newsletter box (the shared Eyebrow is blue). */
function NewsletterEyebrow() {
  return (
    <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-soft">
      Subscribe to the newsletter
    </span>
  );
}

type Status = "idle" | "submitting" | "success" | "error";
type Variant = "full" | "compact";

/** Shared subscribe logic + state for both layouts. */
function useSubscribe(source: string) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        alreadySubscribed?: boolean;
      };

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setCode(data.code ?? "");
      setAlreadySubscribed(!!data.alreadySubscribed);
      setStatus("success");
      trackEvent("newsletter_signup", { source, new_subscriber: !data.alreadySubscribed });
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return { email, setEmail, status, message, code, alreadySubscribed, submit };
}

/**
 * Newsletter subscription box. Leaving an email joins the list and unlocks a
 * 10% discount on the subscriber's first session; the discount code is revealed
 * on success. Talks to POST /api/newsletter (Admin SDK writes the subscriber).
 *
 * `variant="full"` is the standalone hero-sized block (home). `variant="compact"`
 * is a slim inline bar for promoting the offer inside other flows (pricing,
 * booking) without dominating the page.
 */
export function NewsletterSignup({
  source = "site",
  variant = "full",
}: {
  source?: string;
  variant?: Variant;
}) {
  const s = useSubscribe(source);

  const nebula = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        background:
          "radial-gradient(120% 120% at 100% 0%, rgba(176,124,255,0.16) 0%, transparent 55%), radial-gradient(120% 120% at 0% 100%, rgba(110,168,254,0.14) 0%, transparent 55%)",
      }}
    />
  );

  const inputClass =
    "h-11 flex-1 rounded-[4px] bg-surface-2 px-4 text-sm text-foreground outline-none ring-1 ring-hairline placeholder:text-muted focus:ring-2 focus:ring-accent disabled:opacity-60";
  const buttonClass =
    "inline-flex h-11 items-center justify-center rounded-[4px] bg-accent px-5 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:opacity-60";

  if (variant === "compact") {
    return (
      <div className="relative overflow-hidden rounded-[4px] bg-surface p-5 ring-1 ring-hairline sm:p-6">
        {nebula}
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {s.status === "success" ? (
            <>
              <div>
                <NewsletterEyebrow />
                <p className="mt-1 text-sm text-foreground/90">
                  {s.alreadySubscribed
                    ? "You are already on the list. Here is your code again:"
                    : "You are in. Use this code at checkout for 10% off:"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-[4px] bg-surface-2 px-4 py-2.5 ring-1 ring-hairline">
                <span className="font-mono text-base font-semibold tracking-[0.15em] text-gold-soft">
                  {s.code}
                </span>
                <CopyButton value={s.code} />
              </div>
            </>
          ) : (
            <>
              <div className="sm:max-w-xs">
                <NewsletterEyebrow />
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Get 10% off your first session
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Subscribe for tips and your discount code.
                </p>
                {s.status === "error" && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {s.message}
                  </p>
                )}
              </div>
              <form onSubmit={s.submit} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <label htmlFor="newsletter-email-compact" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email-compact"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={s.email}
                  onChange={(e) => s.setEmail(e.target.value)}
                  disabled={s.status === "submitting"}
                  className={`${inputClass} sm:w-56`}
                />
                <button type="submit" disabled={s.status === "submitting"} className={buttonClass}>
                  {s.status === "submitting" ? "Subscribing…" : "Subscribe"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[4px] bg-surface p-8 ring-1 ring-hairline sm:p-10">
      {nebula}
      <div className="relative mx-auto max-w-xl text-center">
        <NewsletterEyebrow />

        {s.status === "success" ? (
          <>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {s.alreadySubscribed ? "You are already on the list" : "You are in. Clear skies ahead."}
            </h2>
            <p className="mt-3 text-muted">
              {s.alreadySubscribed
                ? "Here is your first-session discount code again, in case you need it:"
                : "Here is your 10% off code for your first session:"}
            </p>
            <div className="mt-5 inline-flex items-center gap-3 rounded-[4px] bg-surface-2 px-5 py-3 ring-1 ring-hairline">
              <span className="font-mono text-lg font-semibold tracking-[0.15em] text-gold-soft">
                {s.code}
              </span>
              <CopyButton value={s.code} />
            </div>
            <p className="mt-4 text-xs text-muted">
              Apply it at checkout for 10% off your first booked session.
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Get 10% off your first session
            </h2>
            <p className="mt-3 text-muted">
              Drop your email for imaging tips, dark-sky forecasts, and target guides.
              Subscribe now and we will send a 10% discount code for your first session.
            </p>

            <form onSubmit={s.submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={s.email}
                onChange={(e) => s.setEmail(e.target.value)}
                disabled={s.status === "submitting"}
                className={inputClass}
              />
              <button type="submit" disabled={s.status === "submitting"} className={buttonClass}>
                {s.status === "submitting" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>

            {s.status === "error" && (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {s.message}
              </p>
            )}
            <p className="mt-4 text-xs text-muted">No spam. Unsubscribe anytime.</p>
          </>
        )}
      </div>
    </div>
  );
}

/** Small button that copies the discount code and confirms briefly. */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked (e.g. insecure context) — leave the code visible to copy manually.
        }
      }}
      className="rounded-[4px] bg-surface px-2.5 py-1 text-xs font-medium text-accent ring-1 ring-hairline hover:text-gold-soft"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
