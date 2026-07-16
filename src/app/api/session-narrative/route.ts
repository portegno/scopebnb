import { NextResponse } from "next/server";
import { getSessionReport } from "@/data/sessions";
import { generateNarrative } from "@/lib/sessions/narrate";
import type { SessionNarrative } from "@/lib/sessions/report";

/**
 * Mike's AI narrative for a session report. Given a report id, extract-and-assess
 * has already produced the numbers; this endpoint only generates the prose.
 * Cached in memory per report id for the server's lifetime — the narrative for a
 * finished night never changes, so it's generated once.
 *
 * In production this would run once at delivery time and be stored on the report
 * doc; the route exists for on-demand generation and testing.
 */
export const runtime = "nodejs";

const cache = new Map<string, SessionNarrative>();

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const cached = cache.get(id);
  if (cached) return NextResponse.json({ narrative: cached, cached: true });

  const report = getSessionReport(id);
  if (!report) return NextResponse.json({ error: "unknown report" }, { status: 404 });

  try {
    const narrative = await generateNarrative(report);
    cache.set(id, narrative);
    return NextResponse.json({ narrative });
  } catch (e) {
    return NextResponse.json(
      { error: "narrative generation failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
