"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { leadSource } from "./campaign";

/**
 * The signup. One field, because every extra one costs a signup.
 *
 * **The lead carries where it came from.** `source` goes in as
 * `landing:<slug>:<account>`, so a lead that came out of Verónica's outbound can
 * be told apart from one that came off the site, and traced back to the club we
 * wrote to. Without it a lead is just a lead, and the campaign that produced it
 * can't be judged.
 */
export function LeadForm({
  landing,
  cta,
  hint,
  done,
}: {
  landing: string;
  cta: string;
  hint: string;
  done: string;
}) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "yendo" | "listo" | "mal">("idle");
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("yendo");
    setError(null);
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: leadSource(landing, params) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? "Something went wrong. Please try again.");
      setEstado("listo");
    } catch (err) {
      // The message says what happened. A form that just goes quiet is a lead
      // lost twice: once here and once because nobody knows it was lost.
      setEstado("mal");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (estado === "listo") {
    return (
      <p className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground">
        {done}
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@club.org"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={estado === "yendo"}
          className="lp-cta shrink-0 disabled:opacity-60"
        >
          {estado === "yendo" ? "One second…" : cta}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{hint}</p>
      {error ? <p className="mt-2 text-xs text-gold-soft">{error}</p> : null}
    </form>
  );
}
