import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { parseNinaLog, bestLightPath } from "@/lib/sessions/parseNinaLog";
import { generateNarrative } from "@/lib/sessions/narrate";
import { saveSessionReport, signLightUpload } from "@/lib/sessions/store";
import type { Booking } from "@/lib/bookings/types";

/**
 * POST /api/sessions/ingest — the on-site N.I.N.A. hook drops a finished night
 * here. Body (JSON):
 *   { secret, ninaLog, phd2Log? }
 * `ninaLog` is the raw N.I.N.A. .log (the metrics source, parsed from scratch)
 * and `phd2Log` is PHD2's own guide log (optional, for guiding RMS). The session
 * date is derived from the log itself.
 *
 * The response includes a short-lived signed `uploadUrl`: the uploader PUTs one
 * raw light FITS straight to Storage (bypassing the request-body size limit),
 * then calls POST /api/sessions/ingest/image to have it decoded + auto-stretched
 * into the preview image (an honest single sub), replacing the DSS2 fallback.
 *
 * Pipeline: parse (deterministic, no plugin) -> narrate (Gemini, Mike's voice)
 * -> store. If a managed booking exists for that night, its client is used and
 * its `reportId` is wired so the dashboard link lights up automatically.
 *
 * Auth: a shared secret in SESSION_INGEST_SECRET (never a user credential).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { secret?: string; ninaLog?: string; phd2Log?: string; lightFitsBase64?: string };

export async function POST(req: Request) {
  const secret = process.env.SESSION_INGEST_SECRET;
  if (!secret) return NextResponse.json({ error: "ingest not configured" }, { status: 500 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.secret !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!body.ninaLog || body.ninaLog.length < 500) {
    return NextResponse.json({ error: "missing ninaLog" }, { status: 400 });
  }

  try {
    // Parse first (date comes from the log), then attribute to a booking.
    const report = parseNinaLog(body.ninaLog, {
      id: "pending",
      client: { name: "Astrophotographer" },
      status: "delivered",
      phd2Log: body.phd2Log,
    });

    if (!/^\d{4}-\d{2}-\d{2}$/.test(report.date)) {
      return NextResponse.json({ error: "could not derive session date from log" }, { status: 422 });
    }
    report.id = `session-${report.date}`;
    const id = report.id;

    const booking = await findBookingForDate(report.date);
    if (booking?.contact?.name) report.client = { name: booking.contact.name, email: booking.contact.email };

    // Narrate (Mike). If Gemini fails, still store the report without prose;
    // the UI falls back to deterministic assessment cards.
    try {
      report.narrative = await generateNarrative(report);
    } catch (e) {
      console.error("[ingest] narrative failed:", e instanceof Error ? e.message : e);
    }

    await saveSessionReport(report);

    // Wire the booking so the client's dashboard shows "View session report".
    if (booking?.id) {
      await adminDb.collection("bookings").doc(booking.id).set({ reportId: id }, { merge: true });
    }

    // Signed URL for the uploader to PUT one raw light straight to Storage,
    // then finalize via /api/sessions/ingest/image. Best-effort: if signing
    // is unavailable the report still ships with the DSS2 field fallback.
    let uploadUrl: string | null = null;
    try {
      uploadUrl = (await signLightUpload(id)).uploadUrl;
    } catch (e) {
      console.error("[ingest] could not sign light upload:", e instanceof Error ? e.message : e);
    }

    // The sharpest sub of the night (by HFR) — the uploader reads this exact
    // path off disk and PUTs it to `uploadUrl` for the preview image.
    const lightPath = bestLightPath(body.ninaLog);

    return NextResponse.json({
      ok: true,
      id,
      url: `/report/${id}`,
      target: report.target.name,
      frames: report.capture.frames,
      narrated: !!report.narrative,
      linkedBooking: booking?.id ?? null,
      uploadUrl,
      lightPath,
    });
  } catch (e) {
    console.error("[ingest] failed:", e);
    return NextResponse.json(
      { error: "ingest failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

/** The most relevant managed booking for a night (prefers captured/delivered). */
async function findBookingForDate(date: string): Promise<Booking | null> {
  const snap = await adminDb.collection("bookings").where("date", "==", date).get();
  if (snap.empty) return null;
  const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }));
  const managed = rows.filter((b) => (b.product ?? "managed") === "managed");
  const pool = managed.length ? managed : rows;
  const rank = (s?: string) => (s === "captured" ? 0 : s === "delivered" ? 1 : s === "confirmed" ? 2 : 3);
  pool.sort((a, b) => rank(a.status) - rank(b.status));
  return pool[0] ?? null;
}
