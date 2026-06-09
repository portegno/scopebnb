"use client";

import { auth } from "@/lib/firebase/client";

/** Thrown by adminFetch on a non-OK response; carries the HTTP status. */
export class AdminFetchError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Fetch an /api/admin/* endpoint with the current user's Firebase ID token as a
 * Bearer credential. Parses JSON and throws AdminFetchError on failure.
 */
export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw new AdminFetchError(401, "Not signed in");
  const token = await user.getIdToken();

  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AdminFetchError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}
