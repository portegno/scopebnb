"use client";

import type { Booking, CaptureFilterKey } from "@/lib/bookings/types";

/** Read-only capture-plan summary shown in the booking detail sheets (client +
 *  admin). Themes light/dark via `light`. Renders nothing for remote bookings
 *  or when no plan was saved. */

const FILTER_LABEL: Record<CaptureFilterKey, { name: string; tag: string }> = {
  clear: { name: "No filter", tag: "broadband colour" },
  lextreme: { name: "Optolong L-Extreme", tag: "Hα + OIII narrowband" },
};

const fmtDur = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m ? ` ${m}m` : ""}`;
};

export function CapturePlanDetail({ booking, light }: { booking: Booking; light?: boolean }) {
  const cp = booking.capturePlan;
  if (booking.product === "remote" || !cp) return null;

  const labelCls = light ? "text-slate-400" : "text-muted";
  const valCls = light ? "text-slate-800" : "text-foreground/90";
  const subtleCls = light ? "text-slate-500" : "text-muted";
  const cardCls = light ? "bg-slate-50 ring-slate-200" : "bg-surface-2 ring-hairline";
  const dividerCls = light ? "border-slate-200" : "border-hairline";

  const enabled = (cp.filters ?? []).filter((f) => f.enabled && f.subs > 0);
  const total = enabled.reduce((s, f) => s + (f.subSeconds * f.subs) / 3600, 0);

  return (
    <div className="mt-5">
      <div className={`text-xs uppercase tracking-wider ${labelCls}`}>Capture plan</div>

      {cp.autoManaged ? (
        <p className={`mt-2 text-sm ${valCls}`}>Filters &amp; exposures chosen by the ScopeBnB team.</p>
      ) : enabled.length === 0 ? (
        <p className={`mt-2 text-sm ${subtleCls}`}>No filters selected.</p>
      ) : (
        <div className={`mt-2 space-y-1.5 rounded-[4px] p-3 ring-1 ${cardCls}`}>
          {enabled.map((f) => {
            const meta = FILTER_LABEL[f.key];
            return (
              <div key={f.key} className="flex items-baseline justify-between gap-3 text-sm">
                <span className={valCls}>
                  {meta?.name ?? f.key} <span className={subtleCls}>· {meta?.tag}</span>
                </span>
                <span className={subtleCls}>
                  {f.subSeconds}s × {f.subs} · {fmtDur((f.subSeconds * f.subs) / 3600)}
                </span>
              </div>
            );
          })}
          <div className={`flex justify-between border-t pt-1.5 text-sm ${dividerCls}`}>
            <span className={labelCls}>Requested</span>
            <span className={valCls}>{fmtDur(total)}</span>
          </div>
        </div>
      )}

      {cp.notes && (
        <div className="mt-3">
          <div className={`text-xs uppercase tracking-wider ${labelCls}`}>Notes for the team</div>
          <p className={`mt-1 whitespace-pre-wrap text-sm ${valCls}`}>{cp.notes}</p>
        </div>
      )}
    </div>
  );
}
