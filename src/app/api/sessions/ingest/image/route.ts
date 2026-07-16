import { NextResponse } from "next/server";
import { buildImageFromUploadedLight } from "@/lib/sessions/store";

/**
 * POST /api/sessions/ingest/image — finalize the preview image for a report.
 * Body (JSON): { secret, id }
 *
 * By this point the uploader has PUT one raw light FITS to the signed URL
 * returned by /api/sessions/ingest. Here we read it back from Storage, decode +
 * auto-stretch it into a JPEG (see fitsToJpg.ts), store the JPEG, patch the
 * report's `finalImage`, and delete the raw FITS. Kept separate from the log
 * ingest so the (large) image step can fail without losing the report.
 *
 * Auth: the same shared SESSION_INGEST_SECRET (never a user credential).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { secret?: string; id?: string };

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
  if (!body.id || !/^[\w-]+$/.test(body.id)) {
    return NextResponse.json({ error: "missing or invalid id" }, { status: 400 });
  }

  try {
    const src = await buildImageFromUploadedLight(body.id);
    if (!src) return NextResponse.json({ ok: false, reason: "no uploaded light found" }, { status: 404 });
    return NextResponse.json({ ok: true, id: body.id, src });
  } catch (e) {
    console.error("[ingest/image] failed:", e);
    return NextResponse.json(
      { error: "image build failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
