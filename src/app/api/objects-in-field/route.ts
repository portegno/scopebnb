import { NextResponse } from "next/server";

/**
 * Notable deep-sky objects within a field, for AstroBin-style annotations.
 * Queries SIMBAD's `ident` table for objects that carry a Messier / NGC / IC /
 * Sharpless / named identifier (so famous objects surface even in dense fields),
 * preferring the most recognizable catalog name per object.
 */
export const runtime = "nodejs";

// Strict catalog forms only — avoids sub-features like "M 42 HH 1" or "NAME OMC-2".
const STRICT = /^(M\s\d{1,3}|NGC\s\d+[A-Z]?|IC\s\d+[A-Z]?|Sh2-?\d+)$/;

// Lower = more recognizable, used to pick one label per object.
function rank(id: string): number {
  if (/^M\s/.test(id)) return 0;
  if (/^NGC\s/.test(id)) return 1;
  if (/^IC\s/.test(id)) return 2;
  return 3;
}

const cache = new Map<string, { name: string; ra: number; dec: number }[]>();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ra = parseFloat(url.searchParams.get("ra") ?? "");
  const dec = parseFloat(url.searchParams.get("dec") ?? "");
  const radius = Math.min(3, Math.max(0.2, parseFloat(url.searchParams.get("radius") ?? "1")));
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
    return NextResponse.json({ error: "ra/dec required" }, { status: 400 });
  }

  const key = `${ra.toFixed(1)},${dec.toFixed(1)},${radius.toFixed(1)}`;
  const cached = cache.get(key);
  if (cached) return NextResponse.json({ objects: cached });

  const adql =
    `SELECT TOP 300 b.main_id, b.ra, b.dec, id.id ` +
    `FROM basic AS b JOIN ident AS id ON id.oidref = b.oid ` +
    `WHERE 1=CONTAINS(POINT('ICRS',b.ra,b.dec),CIRCLE('ICRS',${ra},${dec},${radius})) ` +
    `AND (id.id LIKE 'M %' OR id.id LIKE 'NGC %' OR id.id LIKE 'IC %' OR id.id LIKE 'Sh2%')`;

  try {
    const res = await fetch("https://simbad.u-strasbg.fr/simbad/sim-tap/sync", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ REQUEST: "doQuery", LANG: "ADQL", FORMAT: "json", QUERY: adql }),
    });
    const data = await res.json();
    const rows: [string, number, number, string][] = data?.data ?? [];

    // One label per object (keyed by main_id), keeping the best-ranked identifier.
    const best = new Map<string, { name: string; ra: number; dec: number; r: number }>();
    for (const [mainId, r, d, ident] of rows) {
      const collapsed = ident.replace(/\s+/g, " ").trim();
      if (!STRICT.test(collapsed)) continue; // skip sub-features
      const score = rank(collapsed);
      const prev = best.get(mainId);
      if (!prev || score < prev.r) {
        best.set(mainId, { name: collapsed, ra: r, dec: d, r: score });
      }
    }
    const objects = [...best.values()]
      .sort((a, b) => a.r - b.r)
      .map(({ name, ra: r, dec: d }) => ({ name, ra: r, dec: d }))
      .slice(0, 40);
    cache.set(key, objects);
    return NextResponse.json({ objects });
  } catch (e) {
    return NextResponse.json({ objects: [], error: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}
