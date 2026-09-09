"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/admin/ui";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import type { Customer } from "@/app/api/admin/customers/route";

const fmtDate = (ymd: string | null) =>
  ymd
    ? new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

export default function AdminCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    adminFetch<{ customers: Customer[] }>("/api/admin/customers")
      .then((d) => setCustomers(d.customers))
      .catch((e) =>
        setError(
          e instanceof AdminFetchError && e.status === 403
            ? "Your account can't view customers."
            : "Could not load customers.",
        ),
      )
      .finally(() => setBusy(false));
  }, [user]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q));
  }, [customers, search]);

  const showRevenue = customers.some((c) => c.totalPaidUsd != null);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-background">Customers</h1>
      <p className="mt-1 text-sm text-slate-500">Built from bookings, grouped by email. Test orders are excluded.</p>

      {busy ? (
        <p className="mt-6 text-sm text-slate-500">Loading customers…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-600">{error}</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500"
            />
            <span className="text-xs text-slate-400">
              {visible.length} of {customers.length}
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">No customers yet.</p>
          ) : (
            <Card className="mt-6 overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-medium">Customer</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Bookings</th>
                    {showRevenue && <th className="px-4 py-2 font-medium">Total paid</th>}
                    <th className="px-4 py-2 font-medium">Last booking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((c) => (
                    <tr key={c.email} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 align-top">
                        <span className="block font-medium text-slate-800">{c.name || "—"}</span>
                        {c.address && <span className="block text-xs text-slate-400">{c.address}</span>}
                      </td>
                      <td className="px-4 py-2.5 align-top">
                        <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline">
                          {c.email}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 align-top text-slate-700">
                        {c.bookings}
                        {c.paidBookings > 0 && <span className="text-slate-400"> · {c.paidBookings} paid</span>}
                      </td>
                      {showRevenue && (
                        <td className="px-4 py-2.5 align-top font-semibold text-slate-800">
                          {c.totalPaidUsd != null ? `$${c.totalPaidUsd.toLocaleString("en-US")}` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-2.5 align-top text-slate-500">{fmtDate(c.lastDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
