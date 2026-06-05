"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { signInWithGoogle } from "@/lib/firebase/users";
import { firebaseEnabled } from "@/lib/firebase/client";

/** Google sign-in button. The parent decides where to route via `onSuccess`. */
export function GoogleButton({
  label,
  onSuccess,
}: {
  label: string;
  onSuccess: (user: User) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      onSuccess(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Firebase:\s*/, "")
          : "Google sign-in failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || !firebaseEnabled}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-surface-2 text-sm font-semibold text-foreground ring-1 ring-hairline hover:bg-surface-2/70 disabled:opacity-50"
      >
        <GoogleIcon />
        {busy ? "Connecting…" : label}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
