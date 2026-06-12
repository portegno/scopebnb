"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { useAdminMe } from "@/components/admin/AdminMeContext";
import { OrderDetailModal, Row, fmtHour } from "@/components/admin/OrderDetailModal";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking } from "@/lib/bookings/types";
import { STATUS_LABEL, type BookingStatus } from "@/lib/bookings/status";

// Two-tab split of the booking lifecycle: "pending" = not yet imaged (upcoming),
// "completed" = imaged or closed. The exact status is still filterable within a tab.
const TAB_STATUSES: Record<"pending" | "completed", BookingStatus[]> = {
  pending: ["requested", "confirmed"],
  completed: ["captured", "delivered", "cancelled"],
};
type Tab = keyof typeof TAB_STATUSES;

const ctrl =
  "h-8 rounded-[4px] border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-slate-500";

const fmtDate = (d?: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtCreated = (t?: { seconds: number } | null) =>
  t ? new Date(t.seconds * 1000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminSessions() {
  const { user } = useAuth();
  const { can } = useAdminMe();
  const showCustomers = can("customers.view");
  const showRevenue = can("revenue.view");

  const [orders, setOrders] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);

  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [productFilter, setProductFilter] = useState<"all" | "managed" | "remote">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    setError(null);
    adminFetch<{ orders: Booking[] }>("/api/admin/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) =>
        setError(
          e instanceof AdminFetchError && e.status === 403
            ? "Access denied — your account is not an admin."
            : "Could not load sessions.",
        ),
      )
      .finally(() => setBusy(false));
  }, [user]);

  // Reset the status filter when switching tabs (statuses differ per tab).
  function switchTab(next: Tab) {
    setTab(next);
    setStatusFilter("all");
  }

  const counts = useMemo(() => {
    const inTab = (t: Tab) => orders.filter((o) => TAB_STATUSES[t].includes((o.status ?? "requested") as BookingStatus)).length;
    return { pending: inTab("pending"), completed: inTab("completed") };
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const tabStatuses = TAB_STATUSES[tab];
    const rows = orders.filter((o) => {
      const status = (o.status ?? "requested") as BookingStatus;
      if (!tabStatuses.includes(status)) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (productFilter !== "all" && (o.product ?? "managed") !== productFilter) return false;
      if (from && (!o.date || o.date < from)) return false;
      if (to && (!o.date || o.date > to)) return false;
      if (q) {
        const hay = `${o.contact?.name ?? ""} ${o.contact?.email ?? ""} ${o.targetName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Pending: soonest night first. Completed: most recent night first.
    const dir = tab === "pending" ? 1 : -1;
    return rows.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") * dir);
  }, [orders, tab, search, statusFilter, productFilter, from, to]);

  const total = tab === "pending" ? counts.pending : counts.completed;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-background">Sessions</h1>
      <p className="mt-1 text-sm text-slate-500">Booking history, split into pending and completed.</p>

      {busy ? (
        <p className="mt-6 text-sm text-slate-500">Loading sessions…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-600">{error}</p>
      ) : (
        <>
          {/* Tabs */}
          <div className="mt-6 flex gap-1">
            {(["pending", "completed"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`inline-flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  tab === t ? "bg-surface-2 text-white" : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
                <span
                  className={`rounded-[4px] px-1.5 text-xs ${tab === t ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}
                >
                  {counts[t]}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client or target…"
              className="h-8 w-56 rounded-[4px] border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-500"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={ctrl}>
              <option value="all">All statuses</option>
              {TAB_STATUSES[tab].map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select value={productFilter} onChange={(e) => setProductFilter(e.target.value as typeof productFilter)} className={ctrl}>
              <option value="all">All types</option>
              <option value="managed">Managed</option>
              <option value="remote">Remote</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-slate-400">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={ctrl} />
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-400">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={ctrl} />
            </label>
            {(from || to || search || statusFilter !== "all" || productFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setProductFilter("all");
                  setFrom("");
                  setTo("");
                }}
                className="text-xs text-slate-500 underline hover:text-slate-700"
              >
                Clear
              </button>
            )}
            <span className="ml-auto text-xs text-slate-400">
              {visible.length} of {total}
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">No sessions match.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-[4px] border border-slate-300/70 bg-slate-50">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Night</th>
                    <th className="px-3 py-2 font-medium">Session</th>
                    {showCustomers && <th className="px-3 py-2 font-medium">Client</th>}
                    <th className="px-3 py-2 font-medium">Type</th>
                    {showRevenue && <th className="px-3 py-2 font-medium">Price</th>}
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((o) => (
                    <tr key={o.id} className="cursor-pointer hover:bg-slate-100" onClick={() => setSelected(o)}>
                      <td className="px-3 py-2.5 align-top text-slate-700">
                        {fmtDate(o.date)}
                        {o.sessionStart != null && o.sessionEnd != null && (
                          <span className="block text-xs text-slate-400">
                            {fmtHour(o.sessionStart)}–{fmtHour(o.sessionEnd)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-top text-slate-800">
                        {o.product === "remote" ? <span className="text-slate-500">Remote night</span> : (o.targetName ?? "—")}
                      </td>
                      {showCustomers && (
                        <td className="px-3 py-2.5 align-top text-slate-700">
                          {o.contact?.name ?? <span className="text-slate-400">{o.contact?.email ?? "—"}</span>}
                        </td>
                      )}
                      <td className="px-3 py-2.5 align-top capitalize text-slate-700">{o.product ?? "managed"}</td>
                      {showRevenue && (
                        <td className="px-3 py-2.5 align-top text-slate-700">{o.priceUsd != null ? `$${o.priceUsd}` : "—"}</td>
                      )}
                      <td className="px-3 py-2.5 align-top">
                        <StatusBadge status={o.status} light />
                      </td>
                      <td className="px-3 py-2.5 align-top text-slate-500">{fmtCreated(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <OrderDetailModal
          booking={selected}
          onClose={() => setSelected(null)}
          extraRows={
            <>
              {showCustomers && selected.contact?.name && <Row label="Client">{selected.contact.name}</Row>}
              {showCustomers && selected.contact?.email && (
                <Row label="Email">
                  <a href={`mailto:${selected.contact.email}`} className="text-blue-600 hover:underline">
                    {selected.contact.email}
                  </a>
                </Row>
              )}
              <Row label="Assigned to">{selected.assignedTo ?? <span className="text-slate-400">Unassigned</span>}</Row>
              <Row label="Reviewed by">{selected.reviewedBy ?? <span className="text-slate-400">Not reviewed</span>}</Row>
            </>
          }
        />
      )}
    </div>
  );
}
