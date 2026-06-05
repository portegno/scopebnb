import { NextResponse } from "next/server";
import { commonNameFor } from "@/data/commonNames";

/**
 * Reverse-lookup: given sky coordinates, return the nearest *notable* deep-sky
 * object (Messier / NGC / IC / Sharpless / …) via SIMBAD (CDS Strasbourg).
 * Obscure survey designations (SDSS, LEDA, 2MASX…) are ignored so the framer
 * names famous regions and falls back to coordinates elsewhere. When the object
 * has a popular name (M 42 → Orion Nebula) it's returned as `common`.
 */
export const runtime = "nodejs";

type Ident =
  | { name: string; common: string | null; otype: string; sep: number }
  | { name: null };

const cache = new Map<string, Ident>();

// Catalogs worth naming. main_id is matched after collapsing internal spaces.
const FAMOUS =
  /^(M\s?\d|NGC\s?\d|IC\s?\d|Sh2|LBN|LDN|Mel\s?\d|Cr\s?\d|Tr\s?\d|Stock|Barnard|Ced|vdB|Abell|Arp|RCW|Gum|Hen|Caldwell|NAME)/i;

const DSO_TYPES =
  "'G','GlC','OpC','PN','SNR','HII','Cl*','As*','GiG','IG','ClG','SBG','AGN','EmG','rG'," +
  "'ISM','Cld','RNe','MoC','GNe','DNe','SFR','Bub','HH','EmN','Neb','sh'";

function clean(id: string) {
  return id.replace(/\s+/g, " ").replace(/^NAME /, "").trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ra = parseFloat(url.searchParams.get("ra") ?? "");
  const dec = parseFloat(url.searchParams.get("dec") ?? "");
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
    return NextResponse.json({ error: "ra/dec required" }, { status: 400 });
  }

  // Cache by ~0.1° cell to cut repeat calls while panning.
  const key = `${ra.toFixed(1)},${dec.toFixed(1)}`;
  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached);

  const adql =
    `SELECT TOP 16 main_id, otype, DISTANCE(POINT('ICRS',ra,dec),POINT('ICRS',${ra},${dec})) AS d ` +
    `FROM basic WHERE 1=CONTAINS(POINT('ICRS',ra,dec),CIRCLE('ICRS',${ra},${dec},1.3)) ` +
    `AND otype IN (${DSO_TYPES}) ORDER BY d ASC`;

  try {
    const res = await fetch("https://simbad.u-strasbg.fr/simbad/sim-tap/sync", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ REQUEST: "doQuery", LANG: "ADQL", FORMAT: "json", QUERY: adql }),
    });
    const data = await res.json();
    const rows: [string, string, number][] = data?.data ?? [];

    let result: Ident = { name: null };
    for (const [mainId, otype, d] of rows) {
      const name = clean(mainId);
      if (FAMOUS.test(name)) {
        result = { name, common: commonNameFor(name), otype, sep: +(+d).toFixed(3) };
        break;
      }
    }
    cache.set(key, result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { name: null, error: e instanceof Error ? e.message : String(e) },
      { status: 200 },
    );
  }
}
