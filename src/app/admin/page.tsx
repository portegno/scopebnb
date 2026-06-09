"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { useAdminMe } from "@/components/admin/AdminMeContext";
import { OrderDetailModal, Row, fmtHour } from "@/components/admin/OrderDetailModal";
import { StatusBadge } from "@/components/StatusBadge";
import type { Booking } from "@/lib/bookings/types";
import { BOOKING_STATUSES, STATUS_LABEL, type BookingStatus } from "@/lib/bookings/status";

type Stats = {
  total: number;
  byStatus: Record<BookingStatus, number>;
  byProduct: { managed: number; remote: number };
  byTier: Record<string, number>;
  revenue: { realized: number; pipeline: number; total: number } | null;
  upcomingNights: number;
};

type Occupancy = {
  year: number;
  month: number; // 1-based
  daysInMonth: number;
  days: Record<string, DayBooking>; // day number -> booked-night summary
  blocks: Record<string, { blockedBy: string; note: string }>; // day number -> block
  tiers: Record<string, string>; // day number -> night-quality tier key
  sold: { count: number; pct: number };
  blocked: { count: number; pct: number };
};

/** Canonical night-tier colours (match src/lib/pricing.ts) — used as the cell border. */
const TIER_HEX: Record<string, string> = {
  dark: "#34d399",
  good: "#6ea8fe",
  bright: "#e9c46a",
  full: "#f87171",
};
const TIER_LABEL: [string, string][] = [
  ["dark", "Dark"],
  ["good", "Good"],
  ["bright", "Bright"],
  ["full", "Full moon"],
];

/** Low-contrast light-grey diagonal stripes for blocked nights. */
const BLOCKED_STRIPES = "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 4px, #e2e8f0 4px, #e2e8f0 8px)";

function MonthOccupancy({ canBlock }: { canBlock: boolean }) {
  const [view, setView] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });
  const [occ, setOcc] = useState<Occupancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const cache = useRef<Map<string, Occupancy>>(new Map());

  const [openBlock, setOpenBlock] = useState<{ date: string; blockedBy: string; note: string } | null>(null);
  const [openBooking, setOpenBooking] = useState<({ date: string } & DayBooking) | null>(null);
  const [blockMode, setBlockMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [askNote, setAskNote] = useState(false);
  const [saving, setSaving] = useState(false);

  const monthParam = `${view.year}-${String(view.month).padStart(2, "0")}`;
  const monthLabel = new Date(view.year, view.month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const t = new Date();
  const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

  const reload = () => {
    cache.current.delete(monthParam);
    setTick((n) => n + 1);
  };

  // Stale-while-revalidate: show the cached month instantly, then refresh.
  useEffect(() => {
    let active = true;
    const cached = cache.current.get(monthParam);
    if (cached) setOcc(cached);
    setLoading(!cached);
    adminFetch<{ occupancy: Occupancy }>(`/api/admin/occupancy?month=${monthParam}`)
      .then((d) => {
        if (!active) return;
        cache.current.set(monthParam, d.occupancy);
        setOcc(d.occupancy);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [monthParam, tick]);

  function goMonth(delta: number) {
    exitBlockMode();
    const dt = new Date(view.year, view.month - 1 + delta, 1);
    setView({ year: dt.getFullYear(), month: dt.getMonth() + 1 });
  }
  function jumpTo(year: number, month: number) {
    exitBlockMode();
    setPickerOpen(false);
    setView({ year, month });
  }

  function toggleSelect(date: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }
  function exitBlockMode() {
    setBlockMode(false);
    setSelected(new Set());
  }
  async function saveBlocks(note: string) {
    setSaving(true);
    try {
      await Promise.all(
        [...selected].map((date) => adminFetch("/api/admin/blocks", { method: "POST", body: JSON.stringify({ date, note }) })),
      );
      setAskNote(false);
      exitBlockMode();
      reload();
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not block nights");
    } finally {
      setSaving(false);
    }
  }

  // Show the correct month's grid immediately (placeholder) until its data loads.
  const matches = !!occ && occ.year === view.year && occ.month === view.month;
  const display: Occupancy = matches
    ? occ!
    : {
        year: view.year,
        month: view.month,
        daysInMonth: new Date(view.year, view.month, 0).getDate(),
        days: {},
        blocks: {},
        tiers: {},
        sold: { count: 0, pct: 0 },
        blocked: { count: 0, pct: 0 },
      };
  const days = Array.from({ length: display.daysInMonth }, (_, i) => i + 1);
  const ymd = (d: number) => `${display.year}-${String(display.month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <Card className="p-5">
      <div className="flex items-stretch justify-between">
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex items-center gap-1">
              <button
                onClick={() => goMonth(-1)}
                aria-label="Previous month"
                className="rounded-[4px] px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ‹
              </button>
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className="min-w-36 rounded-[4px] px-1 py-0.5 text-center text-xs font-medium uppercase tracking-wider text-slate-600 hover:bg-slate-100"
              >
                {monthLabel}
                {loading && <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300 align-middle" />}
              </button>
              <button
                onClick={() => goMonth(1)}
                aria-label="Next month"
                className="rounded-[4px] px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ›
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setPickerOpen(false)} />
                  <MonthYearPicker year={view.year} month={view.month} onPick={jumpTo} />
                </>
              )}
            </div>
            {canBlock &&
              (blockMode ? (
                <div className="flex items-center gap-2">
                  <button onClick={exitBlockMode} className="rounded-[4px] border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => setAskNote(true)}
                    disabled={selected.size === 0}
                    className="rounded-[4px] bg-pink-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-pink-600 disabled:opacity-50"
                  >
                    Block {selected.size || ""}
                  </button>
                </div>
              ) : (
                <button onClick={() => setBlockMode(true)} className="rounded-[4px] border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  Block mode
                </button>
              ))}
          </div>

          <div className="mt-3 flex gap-1">
            {days.map((d) => {
              const booking = display.days[String(d)];
              const blk = display.blocks[String(d)];
              const date = ymd(d);
              const isFree = !booking && !blk;
              const isSel = selected.has(date);
              const isToday = date === todayStr;
              const isPast = date < todayStr;

              const tierKey = display.tiers[String(d)];
              const tierHex = TIER_HEX[tierKey] ?? "#e2e8f0";
              const cellStyle: { borderColor: string; backgroundColor?: string; backgroundImage?: string } = {
                borderColor: tierHex,
              };
              let cls = "bg-white text-slate-500"; // free → white, tier-coloured border
              if (booking) {
                // Booked → filled with the night's tier colour.
                cellStyle.backgroundColor = tierHex;
                cls = tierKey === "bright" ? "text-slate-900" : "text-white";
              } else if (blk) {
                // Blocked → low-contrast grey diagonal stripes.
                cellStyle.backgroundImage = BLOCKED_STRIPES;
                cls = "text-slate-500";
              }
              if (blockMode && isFree && isPast) cls = "bg-slate-50 text-slate-300";
              if (isSel) {
                cellStyle.backgroundImage = BLOCKED_STRIPES;
                cls = "text-slate-600";
              }

              const interactive = blockMode ? isFree && !isPast : !!blk || !!booking;
              const tip = blk
                ? `Blocked by ${blk.blockedBy} · ${date}${blk.note ? ` · ${blk.note}` : ""}`
                : booking
                  ? `${date} · ${booking.product === "remote" ? "Remote night" : (booking.targetName ?? "Booked")} · ${booking.status}`
                  : `${date}${isPast ? " · past" : " · free"}`;

              return (
                <button
                  key={d}
                  type="button"
                  disabled={!interactive}
                  aria-label={tip}
                  onClick={() =>
                    blockMode
                      ? toggleSelect(date)
                      : blk
                        ? setOpenBlock({ date, ...blk })
                        : booking
                          ? setOpenBooking({ date, ...booking })
                          : undefined
                  }
                  style={cellStyle}
                  className={`group relative flex h-9 flex-1 items-center justify-center rounded-[3px] border text-[10px] font-medium ${cls} ${
                    isSel ? "ring-2 ring-pink-500" : ""
                  } ${interactive ? "cursor-pointer hover:ring-2 hover:ring-inset hover:ring-slate-400/60" : "cursor-default"}`}
                >
                  {isToday && <span className="absolute -top-1.5 inset-x-1 h-1 rounded-full bg-slate-900" />}
                  {d}
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 translate-y-1 scale-95 whitespace-nowrap rounded-[4px] bg-slate-900 px-2 py-1 text-[11px] font-normal text-white opacity-0 shadow-lg transition-all duration-150 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
                    {tip}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
            <span className="text-slate-400">Night:</span>
            {TIER_LABEL.map(([k, label]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: TIER_HEX[k] }} />
                {label}
              </span>
            ))}
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">filled = booked · outline = free</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px] border border-slate-200" style={{ backgroundImage: BLOCKED_STRIPES }} />
              Blocked
            </span>
          </div>
          {canBlock && (
            <p className="mt-2 text-[11px] text-slate-400">
              {blockMode
                ? "Pick free nights, then Block to save them (you can add a shared note)."
                : "Use Block mode to block nights; click a blocked night to edit or unblock."}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-4 border-l border-slate-200 pl-6 text-right">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Sold</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{matches ? `${display.sold.pct}%` : "—"}</p>
            <p className="text-xs text-slate-500">
              {matches ? display.sold.count : "—"} / {display.daysInMonth} nights
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Blocked</p>
            <p className="text-3xl font-semibold tracking-tight text-pink-500">{matches ? `${display.blocked.pct}%` : "—"}</p>
            <p className="text-xs text-slate-500">
              {matches ? display.blocked.count : "—"} / {display.daysInMonth} nights
            </p>
          </div>
        </div>
      </div>

      {askNote && <NoteDialog count={selected.size} saving={saving} onCancel={() => setAskNote(false)} onSave={saveBlocks} />}
      {openBlock && <BlockModal block={openBlock} canBlock={canBlock} onClose={() => setOpenBlock(null)} reload={reload} />}
      {openBooking && <BookingCard booking={openBooking} onClose={() => setOpenBooking(null)} />}
    </Card>
  );
}

/** Month + year picker popover, opened from the occupancy month label. */
function MonthYearPicker({ year, month, onPick }: { year: number; month: number; onPick: (y: number, m: number) => void }) {
  const [y, setY] = useState(year);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <div
      className="absolute left-0 top-full z-30 mt-1 w-56 rounded-[4px] border border-slate-200 bg-white p-3 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <button onClick={() => setY((v) => v - 1)} aria-label="Previous year" className="rounded-[4px] px-2 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-900">{y}</span>
        <button onClick={() => setY((v) => v + 1)} aria-label="Next year" className="rounded-[4px] px-2 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {MONTHS.map((m, i) => {
          const isCur = y === year && i + 1 === month;
          return (
            <button
              key={m}
              onClick={() => onPick(y, i + 1)}
              className={`rounded-[4px] px-2 py-1.5 text-xs font-medium ${isCur ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Occupancy card shown when clicking a booked night in the strip. */
function BookingCard({ booking, onClose }: { booking: { date: string } & DayBooking; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-[4px] bg-white p-6 shadow-xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">{booking.date}</h3>
          <StatusBadge status={booking.status} light />
        </div>
        <dl className="mt-4 divide-y divide-slate-100">
          <Row label="Type">{booking.product === "remote" ? "Remote Control" : "Managed Imaging"}</Row>
          {booking.targetName && <Row label="Target">{booking.targetName}</Row>}
          <Row label="Night tier">
            <span className="capitalize">{booking.tier}</span>
          </Row>
          {booking.customerName && <Row label="Customer">{booking.customerName}</Row>}
          {booking.priceUsd != null && <Row label="Price">${booking.priceUsd}</Row>}
        </dl>
        <div className="mt-5 flex items-center justify-between">
          <Link href="/admin/orders" className="text-sm font-medium text-blue-600 hover:underline">
            Open in Orders →
          </Link>
          <button onClick={onClose} className="rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Asks for an optional shared note when saving a batch of blocked nights. */
function NoteDialog({ count, saving, onCancel, onSave }: { count: number; saving: boolean; onCancel: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-[4px] bg-white p-6 shadow-xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900">Block {count} night{count === 1 ? "" : "s"}</h3>
        <p className="mt-1 text-sm text-slate-500">Add a reason? (optional — shared on every blocked date)</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. Maintenance, owner use…"
          className="mt-3 w-full rounded-[4px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} disabled={saving} className="rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onSave(note.trim())} disabled={saving} className="rounded-[4px] bg-pink-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-50">
            {saving ? "Blocking…" : "Block nights"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockModal({
  block,
  canBlock,
  onClose,
  reload,
}: {
  block: { date: string; blockedBy: string; note: string };
  canBlock: boolean;
  onClose: () => void;
  reload: () => void;
}) {
  const [note, setNote] = useState(block.note);
  const [busy, setBusy] = useState(false);

  const t = new Date();
  const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  const canUnblock = canBlock && block.date > todayStr; // only future nights

  async function saveNote() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/blocks/${block.date}`, { method: "PATCH", body: JSON.stringify({ note }) });
      reload();
      onClose();
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  async function unblock() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/blocks/${block.date}`, { method: "DELETE" });
      reload();
      onClose();
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not unblock");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-[4px] bg-white p-6 shadow-xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-900">Blocked night · {block.date}</h3>
        <p className="mt-1 text-sm text-slate-500">
          Blocked by <span className="font-medium text-slate-700">{block.blockedBy}</span>
        </p>
        <label className="mt-4 block text-xs uppercase tracking-wider text-slate-400">Reason (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={!canBlock}
          rows={3}
          placeholder="Why is this night blocked?"
          className="mt-1 w-full rounded-[4px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500 disabled:bg-slate-50"
        />
        {canBlock && (
          <div className="mt-4 flex items-center justify-between gap-2">
            {canUnblock ? (
              <button onClick={unblock} disabled={busy} className="rounded-[4px] px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                Unblock
              </button>
            ) : (
              <span className="text-xs text-slate-400">Past/current nights can&apos;t be unblocked</span>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Close
              </button>
              <button onClick={saveNote} disabled={busy} className="rounded-[4px] bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                Save note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type DayBooking = {
  tier: string;
  bookingId: string;
  status: BookingStatus;
  product?: "managed" | "remote";
  targetName?: string;
  customerName?: string;
  priceUsd?: number;
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const DAY = 86_400_000;
const toYMD = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function presetRange(preset: string): { from: number; to: number } {
  const now = Date.now();
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const s = startToday.getTime();
  switch (preset) {
    case "7d":
      return { from: s - 6 * DAY, to: now };
    case "90d":
      return { from: s - 89 * DAY, to: now };
    case "12m":
      return { from: s - 364 * DAY, to: now };
    case "all":
      return { from: 0, to: now };
    case "30d":
    default:
      return { from: s - 29 * DAY, to: now };
  }
}

const PRESETS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

const ctrl =
  "rounded-[4px] border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-500";

function Metric({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

export default function AdminOverview() {
  const { user } = useAuth();
  const { can } = useAdminMe();
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);

  const [preset, setPreset] = useState("30d");
  const [range, setRange] = useState(() => presetRange("30d"));

  function choosePreset(p: string) {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  }
  function setCustom(which: "from" | "to", ymd: string) {
    if (!ymd) return;
    setPreset("custom");
    const ms = which === "from" ? new Date(`${ymd}T00:00:00`).getTime() : new Date(`${ymd}T23:59:59`).getTime();
    setRange((r) => ({ ...r, [which]: ms }));
  }

  useEffect(() => {
    if (!user) return;
    setBusy(true);
    setError(null);
    adminFetch<{ stats: Stats; upcomingSessions: Booking[] }>(`/api/admin/stats?from=${range.from}&to=${range.to}`)
      .then((d) => {
        setStats(d.stats);
        setUpcoming(d.upcomingSessions);
      })
      .catch((e) =>
        setError(
          e instanceof AdminFetchError && e.status === 403
            ? "Access denied — your account is not an admin."
            : "Could not load stats.",
        ),
      )
      .finally(() => setBusy(false));
  }, [user, range.from, range.to]);

  const rangeLabel = useMemo(
    () => (range.from === 0 ? "all time" : `${toYMD(range.from)} → ${toYMD(range.to)}`),
    [range],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">Created in range</span>
          <select value={preset} onChange={(e) => choosePreset(e.target.value)} className={ctrl}>
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <input type="date" value={toYMD(range.from)} onChange={(e) => setCustom("from", e.target.value)} className={ctrl} />
          <span className="text-slate-400">→</span>
          <input type="date" value={toYMD(range.to)} onChange={(e) => setCustom("to", e.target.value)} className={ctrl} />
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {busy && !stats && <p className="text-sm text-slate-500">Loading metrics…</p>}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Bookings" value={stats.total} sub={rangeLabel} />
            {stats.revenue && (
              <Metric label="Pipeline revenue" value={usd(stats.revenue.pipeline)} sub={`${usd(stats.revenue.realized)} realized`} />
            )}
            <Metric label="Upcoming nights" value={stats.upcomingNights} sub="not cancelled, today onward" />
            <Metric label="Managed / Remote" value={`${stats.byProduct.managed} / ${stats.byProduct.remote}`} sub="bookings in range" />
          </div>

          <MonthOccupancy canBlock={can("calendar.block")} />

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">By status</p>
              <dl className="mt-3 divide-y divide-slate-100">
                {BOOKING_STATUSES.map((s) => (
                  <div key={s} className="flex justify-between py-2 text-sm">
                    <dt className="text-slate-500">{STATUS_LABEL[s]}</dt>
                    <dd className="font-medium text-slate-900">{stats.byStatus[s]}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">By night tier</p>
              {Object.keys(stats.byTier).length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No data in range.</p>
              ) : (
                <dl className="mt-3 divide-y divide-slate-100">
                  {Object.entries(stats.byTier).map(([tier, n]) => (
                    <div key={tier} className="flex justify-between py-2 text-sm">
                      <dt className="capitalize text-slate-500">{tier}</dt>
                      <dd className="font-medium text-slate-900">{n}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          </div>

          {/* Upcoming sessions to prepare — closest night first */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Upcoming sessions to prepare</h2>
            <p className="mt-1 text-sm text-slate-500">
              Future nights still requested or confirmed, ordered by how soon they are.
            </p>
            {upcoming.length === 0 ? (
              <Card className="mt-4 p-6 text-center">
                <p className="text-sm text-slate-500">Nothing to prepare right now.</p>
              </Card>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-[4px] border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">When</th>
                      <th className="px-4 py-2 font-medium">Night</th>
                      <th className="px-4 py-2 font-medium">Target</th>
                      {can("customers.view") && <th className="px-4 py-2 font-medium">Customer</th>}
                      {can("revenue.view") && <th className="px-4 py-2 font-medium">Price</th>}
                      <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcoming.map((b) => (
                      <tr key={b.id} onClick={() => setSelected(b)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{daysUntil(b.date)}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {b.date}
                          {b.sessionStart != null && b.sessionEnd != null && (
                            <span className="block text-xs">
                              {fmtHour(b.sessionStart)}–{fmtHour(b.sessionEnd)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {b.product === "remote" ? "Remote night" : (b.targetName ?? "Target")}
                        </td>
                        {can("customers.view") && (
                          <td className="px-4 py-3 text-slate-700">
                            {b.contact?.name ?? <span className="text-slate-400">{b.contact?.email ?? "—"}</span>}
                          </td>
                        )}
                        {can("revenue.view") && (
                          <td className="px-4 py-3 text-slate-700">{b.priceUsd != null ? `$${b.priceUsd}` : "—"}</td>
                        )}
                        <td className="px-4 py-3">
                          <StatusBadge status={b.status} light />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {selected && <OrderDetailModal booking={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** "Tonight" / "Tomorrow" / "in N days" from a YYYY-MM-DD night date. */
function daysUntil(date?: string): string {
  if (!date) return "—";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / DAY);
  if (diff <= 0) return "Tonight";
  if (diff === 1) return "Tomorrow";
  return `in ${diff} days`;
}
