import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/enlace-visto — someone opened a campaign link.
 *
 * **Why this exists.** Analytics is where visits usually get counted, and for
 * these links it was losing them: the URL carries only `?id=code`, so every
 * visit from Verónica's outbound mail landed as `(direct)`. On 18 Sep 2026 the
 * report showed "newsletter" as the only email source, and it got read as her
 * campaign — two different things with nothing to tell them apart.
 *
 * This is the count that does not depend on Analytics: how many times each
 * code was opened, when first and when last, written next to the link record
 * the agency already reads. Joined by `cuenta` it answers "did the club we wrote
 * to open the page?", which is the step between "mail sent" and "they replied".
 *
 * It is called from the browser and not counted when the page is rendered,
 * on purpose: mail security scanners fetch every link in an inbound message
 * to check it, and a server-side count would record a visit for every mail
 * delivered. Scanners fetch HTML; they don't run the page.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { codigo?: unknown };
  const codigo = String(body.codigo ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]{4,32}$/.test(codigo)) return NextResponse.json({ ok: false }, { status: 400 });

  const ref = adminDb.collection("enlaces").doc(codigo);
  try {
    await adminDb.runTransaction(async (t) => {
      const snap = await t.get(ref);
      // An unknown code is not an error on the page, and it is not a visit to
      // count either: there is no link behind it to attribute it to.
      if (!snap.exists) return;
      const ahora = new Date();
      t.update(ref, {
        visitas: FieldValue.increment(1),
        ultimaVisita: ahora,
        ...(snap.data()?.primeraVisita ? {} : { primeraVisita: ahora }),
      });
    });
  } catch (e) {
    // Counting must never break the page that asked for it.
    console.error("[enlace-visto]", codigo, e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
