"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, signOut } from "@/lib/firebase/useAuth";
import { Wordmark } from "@/components/Wordmark";
import { AdminMeProvider, useAdminMe } from "@/components/admin/AdminMeContext";
import type { Permission } from "@/lib/admin/permissions";

const NAV: { href: string; label: string; exact?: boolean; perm: Permission }[] = [
  { href: "/admin", label: "Overview", exact: true, perm: "stats.view" },
  { href: "/admin/orders", label: "Orders", perm: "orders.view" },
  { href: "/admin/sessions", label: "Sessions", perm: "orders.view" },
  { href: "/admin/blog", label: "Blog", perm: "blog.manage" },
  { href: "/admin/team", label: "Team", perm: "team.manage" },
];

/**
 * Admin dashboard shell — a light, self-contained app distinct from the public
 * (dark) site, living outside the (site) route group. The auth gate + nav are
 * cosmetic; real authorization is server-side on every /api/admin/* route.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, enabled } = useAuth();

  if (loading) return <Centered>Loading…</Centered>;
  if (!enabled) return <Centered>Firebase isn&apos;t configured yet.</Centered>;
  if (!user) {
    return (
      <Centered>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-background">Sign in to access the admin</h1>
          <Link
            href="/login"
            className="mt-4 inline-flex h-10 items-center rounded-[4px] bg-surface-2 px-4 text-sm font-semibold text-white hover:bg-surface"
          >
            Log in
          </Link>
        </div>
      </Centered>
    );
  }

  return (
    <AdminMeProvider>
      <Shell>{children}</Shell>
    </AdminMeProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { loading, denied, can } = useAdminMe();
  const pathname = usePathname();

  if (loading) return <Centered>Loading…</Centered>;
  if (denied) {
    return (
      <Centered>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-background">Access denied</h1>
          <p className="mt-2 text-sm text-slate-500">Your account doesn&apos;t have admin access.</p>
        </div>
      </Centered>
    );
  }

  const items = NAV.filter((n) => can(n.perm));

  return (
    <div className="flex min-h-screen bg-slate-200 text-slate-700">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-surface-2">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <Wordmark gradientId="sbGradAdmin" className="h-6 w-auto" />
          <span className="rounded-[4px] bg-gradient-to-r from-accent to-accent-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {items.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`block rounded-[4px] px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent/20 font-medium text-accent"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <p className="truncate px-3 text-xs text-white/40" title={user?.email ?? undefined}>
            {user?.email}
          </p>
          <button
            onClick={() => signOut()}
            className="mt-1 w-full rounded-[4px] px-3 py-2 text-left text-sm text-white/55 hover:bg-white/5 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200 p-6 text-sm text-slate-500">
      {children}
    </div>
  );
}
