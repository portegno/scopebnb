import {
  STATUS_BADGE_CLASS,
  STATUS_BADGE_CLASS_LIGHT,
  STATUS_LABEL,
  isBookingStatus,
} from "@/lib/bookings/status";

/** Small status pill. `light` uses the admin-dashboard palette. */
export function StatusBadge({ status, light = false }: { status?: string; light?: boolean }) {
  const s = isBookingStatus(status) ? status : "requested";
  const cls = light ? STATUS_BADGE_CLASS_LIGHT[s] : STATUS_BADGE_CLASS[s];
  return (
    <span
      className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${cls}`}
    >
      {STATUS_LABEL[s]}
    </span>
  );
}
