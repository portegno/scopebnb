"use client";

import { useEffect, useMemo, useState } from "react";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { useAdminMe } from "@/components/admin/AdminMeContext";
import { OrderDetailModal, Row, fmtHour } from "@/components/admin/OrderDetailModal";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking } from "@/lib/bookings/types";
import { BOOKING_STATUSES, STATUS_LABEL, STATUS_TRANSITIONS, type BookingStatus } from "@/lib/bookings/status";

type SortKey = "date" | "priceUsd" | "createdAt";
type PatchBody =
  | { action: "set-status"; status: BookingStatus }
  | { action: "claim" | "release" | "review" | "unreview" };

const shortEmail = (email?: string | null) => (email ? email.split("@")[0] : "");

const ctrl =
  "rounded-[4px] border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-500";
const btn =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function AdminOrders() {
  const { user } = useAuth();
  const { can } = useAdminMe();
  const myEmail = (user?.email ?? "").toLowerCase();
  const showCustomers = can("customers.view");
  const showRevenue = can("revenue.view");
  const canClaim = can("orders.claim");
  const canReview = can("orders.review");
  const canStatus = can("orders.status");
  const [orders, setOrders] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [productFilter, setProductFilter] = useState<"all" | "managed" | "remote">("all");
  const [assignFilter, setAssignFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "reviewed" | "unreviewed">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });

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
            : "Could not load orders.",
        ),
      )
      .finally(() => setBusy(false));
  }, [user]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = orders.filter((o) => {
      if (statusFilter !== "all" && (o.status ?? "requested") !== statusFilter) return false;
      if (productFilter !== "all" && (o.product ?? "managed") !== productFilter) return false;
      if (assignFilter === "mine" && (o.assignedTo ?? "").toLowerCase() !== myEmail) return false;
      if (assignFilter === "unassigned" && o.assignedTo) return false;
      if (reviewFilter === "reviewed" && !o.reviewedBy) return false;
      if (reviewFilter === "unreviewed" && o.reviewedBy) return false;
      if (q) {
        const hay = `${o.contact?.name ?? ""} ${o.contact?.email ?? ""} ${o.targetName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      const av = sort.key === "createdAt" ? (a.createdAt?.seconds ?? 0) : (a[sort.key] ?? 0);
      const bv = sort.key === "createdAt" ? (b.createdAt?.seconds ?? 0) : (b[sort.key] ?? 0);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [orders, statusFilter, productFilter, assignFilter, reviewFilter, search, sort, myEmail]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  async function mutate(order: Booking, body: PatchBody, optimistic: Partial<Booking>) {
    setSavingId(order.id);
    const prev = orders;
    setOrders((rows) => rows.map((o) => (o.id === order.id ? { ...o, ...optimistic } : o)));
    setSelected((s) => (s && s.id === order.id ? { ...s, ...optimistic } : s));
    try {
      const { order: updated } = await adminFetch<{ order: Booking }>(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setOrders((rows) => rows.map((o) => (o.id === order.id ? { ...o, ...updated } : o)));
      setSelected((s) => (s && s.id === order.id ? { ...s, ...updated } : s));
    } catch (e) {
      setOrders(prev);
      alert(e instanceof AdminFetchError ? e.message : "Could not update order");
    } finally {
      setSavingId(null);
    }
  }

  const changeStatus = (o: Booking, next: BookingStatus) =>
    mutate(o, { action: "set-status", status: next }, { status: next });
  const claim = (o: Booking) => mutate(o, { action: "claim" }, { assignedTo: myEmail });
  const release = (o: Booking) => mutate(o, { action: "release" }, { assignedTo: null, assignedAt: null });
  const review = (o: Booking) => mutate(o, { action: "review" }, { reviewedBy: myEmail });
  const unreview = (o: Booking) => mutate(o, { action: "unreview" }, { reviewedBy: null, reviewedAt: null });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-background">Orders</h1>

      {busy ? (
        <p className="mt-6 text-sm text-slate-500">Loading orders…</p>
      ) : error ? (
        <p className="mt-6 text-sm text-rose-600">{error}</p>
      ) : (
        <>
          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or target…"
              className="h-8 w-56 rounded-[4px] border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-500"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={ctrl}>
              <option value="all">All statuses</option>
              {BOOKING_STATUSES.map((s) => (
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
            <select value={assignFilter} onChange={(e) => setAssignFilter(e.target.value as typeof assignFilter)} className={ctrl}>
              <option value="all">Anyone</option>
              <option value="mine">Mine</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value as typeof reviewFilter)} className={ctrl}>
              <option value="all">Any review</option>
              <option value="reviewed">Reviewed</option>
              <option value="unreviewed">Not reviewed</option>
            </select>
            <span className="text-xs text-slate-400">
              {visible.length} of {orders.length}
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-slate-500">No orders match.</p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-[4px] border border-slate-300/70 bg-slate-50">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <Th onClick={() => toggleSort("date")} active={sort.key === "date"} dir={sort.dir}>
                      Night
                    </Th>
                    <th className="px-3 py-2 font-medium">Order</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    {showRevenue && (
                      <Th onClick={() => toggleSort("priceUsd")} active={sort.key === "priceUsd"} dir={sort.dir}>
                        Price
                      </Th>
                    )}
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Assignee</th>
                    <th className="px-3 py-2 text-center font-medium">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((o) => {
                    const saving = savingId === o.id;
                    return (
                      <tr key={o.id} className="hover:bg-slate-100">
                        <td className="cursor-pointer px-3 py-2.5 align-top text-slate-700" onClick={() => setSelected(o)}>
                          {o.date ?? "—"}
                          {o.sessionStart != null && o.sessionEnd != null && (
                            <span className="block text-xs text-slate-400">
                              {fmtHour(o.sessionStart)}–{fmtHour(o.sessionEnd)}
                            </span>
                          )}
                        </td>
                        <td className="cursor-pointer px-3 py-2.5 align-top" onClick={() => setSelected(o)}>
                          <span className="block text-slate-800">
                            {o.product === "remote" ? <span className="text-slate-500">Remote night</span> : (o.targetName ?? "—")}
                          </span>
                          {showCustomers && (
                            <span className="block text-xs text-slate-400">{o.contact?.name ?? o.contact?.email ?? ""}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top capitalize text-slate-700">{o.product ?? "managed"}</td>
                        {showRevenue && (
                          <td className="px-3 py-2.5 align-top text-slate-700">{o.priceUsd != null ? `$${o.priceUsd}` : "—"}</td>
                        )}
                        <td className="px-3 py-2.5 align-top">
                          <StatusBadge status={o.status} light />
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          {o.assignedTo ? (
                            <span className="text-xs">
                              {o.assignedTo.toLowerCase() === myEmail ? (
                                <span className="font-medium text-background">You</span>
                              ) : (
                                <span className="text-slate-600">{shortEmail(o.assignedTo)}</span>
                              )}
                            </span>
                          ) : canClaim ? (
                            <button type="button" disabled={saving} onClick={() => claim(o)} className="rounded-[4px] border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                              Take
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center align-top">
                          {canReview ? (
                            <button
                              type="button"
                              disabled={saving}
                              title={o.reviewedBy ? `Reviewed by ${o.reviewedBy}` : "Mark reviewed"}
                              onClick={() => (o.reviewedBy ? unreview(o) : review(o))}
                              className={`text-base disabled:opacity-50 ${o.reviewedBy ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"}`}
                            >
                              {o.reviewedBy ? "✓" : "○"}
                            </button>
                          ) : (
                            <span className={o.reviewedBy ? "text-emerald-600" : "text-slate-300"}>{o.reviewedBy ? "✓" : "—"}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
              {selected.contact?.name && <Row label="Customer">{selected.contact.name}</Row>}
              {selected.contact?.email && (
                <Row label="Email">
                  <a href={`mailto:${selected.contact.email}`} className="text-blue-600 hover:underline">
                    {selected.contact.email}
                  </a>
                </Row>
              )}
              <Row label="Assigned to">{selected.assignedTo ?? <span className="text-slate-400">Unassigned</span>}</Row>
              <Row label="Reviewed by">{selected.reviewedBy ?? <span className="text-slate-400">Not reviewed</span>}</Row>
              {selected.statusUpdatedBy && <Row label="Status set by">{selected.statusUpdatedBy}</Row>}
            </>
          }
          footer={
            <div className="mt-5 space-y-3">
              {canStatus && STATUS_TRANSITIONS[(selected.status ?? "requested") as BookingStatus].length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400">Set status:</span>
                  {STATUS_TRANSITIONS[(selected.status ?? "requested") as BookingStatus].map((n) => (
                    <button key={n} type="button" disabled={savingId === selected.id} onClick={() => changeStatus(selected, n)} className={btn}>
                      {STATUS_LABEL[n]}
                    </button>
                  ))}
                </div>
              )}
              {(canClaim || canReview) && (
                <div className="flex flex-wrap items-center gap-2">
                  {canClaim &&
                    (selected.assignedTo?.toLowerCase() === myEmail ? (
                      <button type="button" disabled={savingId === selected.id} onClick={() => release(selected)} className={btn}>
                        Release order
                      </button>
                    ) : (
                      <button type="button" disabled={savingId === selected.id} onClick={() => claim(selected)} className="rounded-[4px] bg-surface-2 px-3 py-1 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50">
                        {selected.assignedTo ? "Take over" : "Take order"}
                      </button>
                    ))}
                  {canReview &&
                    (selected.reviewedBy ? (
                      <button type="button" disabled={savingId === selected.id} onClick={() => unreview(selected)} className={btn}>
                        Unmark reviewed
                      </button>
                    ) : (
                      <button type="button" disabled={savingId === selected.id} onClick={() => review(selected)} className={btn}>
                        Mark reviewed
                      </button>
                    ))}
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="px-3 py-2 font-medium">
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-700">
        {children}
        {active && <span>{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
