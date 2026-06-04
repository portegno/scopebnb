"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { auth, firebaseEnabled } from "./client";

/** Subscribe to the Firebase auth state. */
export function useAuth() {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading, enabled: firebaseEnabled };
}

export async function signOut() {
  if (auth) await fbSignOut(auth);
}
