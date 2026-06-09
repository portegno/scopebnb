"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import type { Permission } from "@/lib/admin/permissions";

export type Me = { email: string; isSuperAdmin: boolean; permissions: Permission[] };

type Ctx = {
  me: Me | null;
  loading: boolean;
  /** True if not signed in or not an admin (403). */
  denied: boolean;
  can: (perm: Permission) => boolean;
};

const AdminMeContext = createContext<Ctx>({ me: null, loading: true, denied: false, can: () => false });

/** Fetches the caller's effective permissions once and exposes them to the admin UI. */
export function AdminMeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setDenied(false);
    adminFetch<Me>("/api/admin/me")
      .then(setMe)
      .catch((e) => {
        if (e instanceof AdminFetchError && (e.status === 403 || e.status === 401)) setDenied(true);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const can = (perm: Permission) => !!me && (me.isSuperAdmin || me.permissions.includes(perm));

  return <AdminMeContext.Provider value={{ me, loading, denied, can }}>{children}</AdminMeContext.Provider>;
}

export const useAdminMe = () => useContext(AdminMeContext);
