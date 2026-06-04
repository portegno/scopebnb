"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Section, Card } from "@/components/ui";
import { auth, firebaseEnabled } from "@/lib/firebase/client";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!auth) {
      setError("Firebase is not configured yet.");
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/, "") : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section className="max-w-md">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted">Free in under two minutes.</p>
        <Card className="mt-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none ring-1 ring-hairline focus:ring-accent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none ring-1 ring-hairline focus:ring-accent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg bg-surface-2 px-3 text-sm outline-none ring-1 ring-hairline focus:ring-accent"
                placeholder="At least 6 characters"
              />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            {!firebaseEnabled && (
              <p className="text-xs text-amber-300">Firebase not configured. Add credentials to .env.local.</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="h-11 w-full rounded-lg bg-accent text-sm font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Sign up"}
            </button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </Section>
  );
}
