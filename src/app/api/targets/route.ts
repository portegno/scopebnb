import { NextResponse } from "next/server";
import { targets } from "@/data/targets";

/** Minimal target catalog for the framer's "recommended tonight" carousel. */
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    targets.map((t) => ({ id: t.id, name: t.name, catalog: t.catalog, ra: t.ra, dec: t.dec })),
  );
}
