import type { Booking } from "@/lib/bookings/types";
import { addDaysYmd } from "@/lib/dates";
import { INTEGRATION_FEE } from "@/lib/pricing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scopebnb.com";
const MIKE_IMG = `${SITE_URL}/images/mike.png`;

/** "2026-09-09" -> "Wed, Sep 9, 2026" (parsed as UTC so the day never shifts). */
function fmtDate(ymd?: string): string {
  if (!ymd) return "your selected night";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** RA in degrees -> "14h 03m 12s" (astronomical convention: RA in hours). */
function raToHms(deg?: number): string | null {
  if (typeof deg !== "number") return null;
  const hoursTotal = ((deg % 360) + 360) % 360 / 15;
  const h = Math.floor(hoursTotal);
  const m = Math.floor((hoursTotal - h) * 60);
  const s = Math.round(((hoursTotal - h) * 60 - m) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

/** Dec in degrees -> "+54° 20′ 55″". */
function decToDms(deg?: number): string | null {
  if (typeof deg !== "number") return null;
  const sign = deg < 0 ? "-" : "+";
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = Math.round(((a - d) * 60 - m) * 60);
  return `${sign}${d}° ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″`;
}

const FILTER_LABELS: Record<string, string> = {
  clear: "Clear (broadband true colour)",
  lextreme: "Optolong L-Extreme (Hα + OIII dual narrowband)",
};

function chosenFilters(b: Booking): string | null {
  const plan = b.capturePlan;
  if (!plan) return null;
  if (plan.autoManaged) return "Our team will pick the best filter and exposures for the target and the sky that night.";
  const on = plan.filters.filter((f) => f.enabled).map((f) => FILTER_LABELS[f.key] ?? f.key);
  return on.length ? on.join(" · ") : null;
}

// ---- HTML building blocks (inline styles, table layout, mail-client safe) ----

const wrap = (inner: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#05070f;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#05070f;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0b0f1d;border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
          ${inner}
          <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7391;">
              Questions? Just reply to this email. ScopeBnB · Starfront Observatories, Rockwood, TX · Bortle 1 dark skies.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const header = (eyebrow: string, title: string, lead: string) => `
  <tr><td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ffd591;font-weight:bold;">${eyebrow}</p>
    <h1 style="margin:12px 0 0 0;font-size:24px;line-height:1.25;color:#e8ebf5;font-weight:600;">${title}</h1>
    <p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#9aa3bd;">${lead}</p>
  </td></tr>`;

/** Mike's warm note, with his portrait. */
const mikeNote = (body: string) => `
  <tr><td style="padding:20px 32px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#121830;border:1px solid rgba(110,168,254,0.25);border-radius:4px;">
      <tr>
        <td width="72" valign="top" style="padding:16px 0 16px 16px;">
          <img src="${MIKE_IMG}" width="56" height="56" alt="Mike" style="display:block;width:56px;height:auto;border-radius:4px;" />
        </td>
        <td valign="top" style="padding:16px;">
          <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6ea8fe;font-weight:bold;">★ A note from Mike</p>
          <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#c8cee0;">${body}</p>
        </td>
      </tr>
    </table>
  </td></tr>`;

/** Key/value detail rows. */
const detailTable = (rows: [string, string][]) => `
  <tr><td style="padding:4px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#121830;border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
      ${rows
        .map(
          ([k, v], i) => `<tr>
        <td style="padding:12px 16px;font-size:13px;color:#9aa3bd;${i ? "border-top:1px solid rgba(255,255,255,0.06);" : ""}width:40%;">${k}</td>
        <td style="padding:12px 16px;font-size:13px;color:#e8ebf5;font-weight:600;${i ? "border-top:1px solid rgba(255,255,255,0.06);" : ""}">${v}</td>
      </tr>`,
        )
        .join("")}
    </table>
  </td></tr>`;

const policyBox = (label: string, body: string) => `
  <tr><td style="padding:8px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;">
    <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#ffd591;font-weight:bold;">${label}</p>
    <p style="margin:6px 0 0 0;font-size:13px;line-height:1.6;color:#9aa3bd;">${body}</p>
  </td></tr>`;

const cta = () => `
  <tr><td align="center" style="padding:16px 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;">
    <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#6ea8fe;color:#05070f;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 22px;border-radius:4px;">View your booking</a>
  </td></tr>`;

/**
 * Booking confirmation email. Adapts to the three modalities:
 *  - managed imaging (we capture the target for you)
 *  - remote single night
 *  - remote week (7 consecutive nights, no per-night weather rescheduling)
 * Mike adds a warm human note to each.
 */
export function bookingConfirmationEmail(b: Booking): { subject: string; html: string; text: string } {
  const name = b.contact?.name?.trim().split(" ")[0];
  const hi = name ? `${name}, ` : "";
  const isRemote = b.product === "remote";
  const isWeek = isRemote && b.remotePlan === "week";
  const nights = typeof b.nights === "number" && b.nights > 0 ? b.nights : 1;
  const startLabel = fmtDate(b.date);
  const endLabel = b.date ? fmtDate(addDaysYmd(b.date, nights - 1)) : "";

  let subject: string;
  let inner: string;
  const textLines: string[] = [];

  if (!isRemote) {
    // ---- Managed imaging ----
    subject = `We're on it: your image of ${b.targetName ?? "your target"} is booked`;
    const rows: [string, string][] = [
      ["Service", "Managed imaging"],
      ["Target", b.targetName ?? "your target"],
      ["Night", startLabel],
    ];
    const ra = raToHms(b.ra);
    const dec = decToDms(b.dec);
    if (ra && dec) rows.push(["Coordinates", `RA ${ra} · Dec ${dec}`]);
    if (typeof b.rotation === "number") rows.push(["Camera rotation", `${b.rotation}°`]);
    const filters = chosenFilters(b);
    if (filters) rows.push(["Filter", filters]);
    if (b.wantsIntegration) rows.push(["Add-on", `Integrated image (+$${INTEGRATION_FEE})`]);
    if (typeof b.totalUsd === "number") rows.push(["Total", `$${b.totalUsd}`]);

    inner =
      header(
        "Booking received",
        `We'll capture ${b.targetName ?? "your target"} for you.`,
        `${hi}thanks for booking with ScopeBnB. On the night of <strong style="color:#e8ebf5;">${startLabel}</strong> our team will point the rig at your target and image it for you. You'll get your calibrated light and calibration frames in your dashboard within 24 hours of the session.`,
      ) +
      detailTable(rows) +
      policyBox(
        "Next steps",
        `Before your night we'll send a short confirmation of the service: target, framing (coordinates and camera rotation)${chosenFilters(b) ? " and your chosen filter" : ""}, so everything is exactly how you want it.`,
      ) +
      policyBox(
        "Weather policy",
        `Clear skies aren't guaranteed on any single date. If your night isn't usable, we automatically reschedule to the next good night at no extra cost. You don't have to do anything.`,
      ) +
      mikeNote(
        `Nice pick. I'll make sure we frame it well and catch it at its best altitude. If the clouds roll in, don't worry, we just move you to the next clear night. Clear skies!`,
      ) +
      cta();

    textLines.push(
      `Thanks for booking with ScopeBnB.`,
      ``,
      `We'll capture ${b.targetName ?? "your target"} for you on ${startLabel}.`,
      `You'll get your calibrated light + calibration frames within 24h of the session.`,
      ``,
      `Target: ${b.targetName ?? "your target"}`,
      ra && dec ? `Coordinates: RA ${ra} · Dec ${dec}` : "",
      typeof b.rotation === "number" ? `Camera rotation: ${b.rotation}°` : "",
      filters ? `Filter: ${filters}` : "",
      b.wantsIntegration ? `Add-on: Integrated image (+$${INTEGRATION_FEE})` : "",
      typeof b.totalUsd === "number" ? `Total: $${b.totalUsd}` : "",
      ``,
      `Next steps: we'll confirm the service details (target, framing, filter) before your night.`,
      `Weather: if your night isn't usable we reschedule to the next good night, free.`,
    );
  } else if (isWeek) {
    // ---- Remote week (7 consecutive nights) ----
    subject = `Your remote week is booked: ${startLabel} to ${endLabel}`;
    inner =
      header(
        "Booking received",
        "The rig is yours for the week.",
        `${hi}thanks for booking with ScopeBnB. You have full remote control of the rig with N.I.N.A. for ${nights} consecutive nights, from <strong style="color:#e8ebf5;">${startLabel}</strong> to <strong style="color:#e8ebf5;">${endLabel}</strong>.`,
      ) +
      detailTable([
        ["Service", "Remote control (weekly)"],
        ["Nights", `${nights} consecutive`],
        ["From", startLabel],
        ["To", endLabel],
        ...(typeof b.totalUsd === "number" ? ([["Total", `$${b.totalUsd}`]] as [string, string][]) : []),
      ]) +
      policyBox(
        "Next steps",
        `We'll send your remote-access details and a quick start guide before your first night so you're ready to drive the rig.`,
      ) +
      policyBox(
        "Weather policy (weekly plan)",
        `The weekly plan is a fixed block. Once your opening night runs, the whole week runs as booked and we don't reschedule the remaining nights for weather. Clear or cloudy, the rig is reserved for you across the full week. If the opening night can't run at all, get in touch and we'll sort out the week with you.`,
      ) +
      mikeNote(
        `A whole week under Bortle 1. That's the good stuff. Plan a few targets so you make the most of every clear hour. I'll get your access set up before night one. Clear skies!`,
      ) +
      cta();

    textLines.push(
      `Thanks for booking with ScopeBnB.`,
      ``,
      `Remote control (weekly): ${nights} consecutive nights, ${startLabel} to ${endLabel}.`,
      typeof b.totalUsd === "number" ? `Total: $${b.totalUsd}` : "",
      ``,
      `Next steps: we'll send remote-access details and a quick start guide before night one.`,
      `Weather (weekly): once the opening night runs, the whole week runs as booked. We don't reschedule individual nights for weather. If the opening night can't run at all, get in touch.`,
    );
  } else {
    // ---- Remote single night ----
    subject = `Your remote night is booked: ${startLabel}`;
    inner =
      header(
        "Booking received",
        "The rig is yours for the night.",
        `${hi}thanks for booking with ScopeBnB. You have full remote control of the rig with N.I.N.A. on the night of <strong style="color:#e8ebf5;">${startLabel}</strong>.`,
      ) +
      detailTable([
        ["Service", "Remote control (single night)"],
        ["Night", startLabel],
        ...(typeof b.totalUsd === "number" ? ([["Total", `$${b.totalUsd}`]] as [string, string][]) : []),
      ]) +
      policyBox(
        "Next steps",
        `We'll send your remote-access details and a quick start guide before your night so you're ready to drive the rig.`,
      ) +
      policyBox(
        "Weather policy",
        `If your night isn't usable, we reschedule it to the next good night at no extra cost.`,
      ) +
      mikeNote(
        `Have a target list ready so you're not deciding at the eyepiece. If the weather turns, we'll just move you to the next clear night. Clear skies!`,
      ) +
      cta();

    textLines.push(
      `Thanks for booking with ScopeBnB.`,
      ``,
      `Remote control (single night): ${startLabel}.`,
      typeof b.totalUsd === "number" ? `Total: $${b.totalUsd}` : "",
      ``,
      `Next steps: we'll send remote-access details and a quick start guide before your night.`,
      `Weather: if your night isn't usable we reschedule to the next good night, free.`,
    );
  }

  const text = textLines.filter((l) => l !== undefined).join("\n") + `\n\nView your booking: ${SITE_URL}/dashboard`;
  return { subject, html: wrap(inner), text };
}
