import "server-only";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { COOKIE } from "./cookie";

/**
 * Resolving a campaign link.
 *
 * The agency's outbound mail used to carry everything in the URL:
 *
 *   /l/club?utm_source=volkssternwarte-kempten-e-v
 *          &utm_medium=outbound&utm_campaign=semana-remota-para-clubes
 *
 * The letter talked to the reader about their own observatory; the link told
 * them they were row seven of a campaign. Now the mail carries `?id=x7k2m9p3`
 * and everything behind it is resolved here, server-side. The address bar says
 * nothing.
 *
 * **The link record deliberately does not hold the contact's email.** The page
 * greets the club, not the person, so the address is never needed here — and
 * copying it into this database would spread a personal detail into a second
 * system for nothing. Who the person is stays in the agency's CRM, joined by
 * `cuenta`.
 */
export type CampaignLink = {
  codigo: string;
  cuenta: string;
  cuentaNombre: string | null;
  campania: string | null;
  medio: string | null;
};

/** The link behind a code, or null. An unknown code is not an error. */
export async function resolverEnlace(codigo: string | undefined): Promise<CampaignLink | null> {
  const id = (codigo ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]{4,32}$/.test(id)) return null;
  try {
    const snap = await adminDb.collection("enlaces").doc(id).get();
    if (!snap.exists) return null;
    const d = snap.data() ?? {};
    return {
      codigo: id,
      cuenta: String(d.cuenta ?? ""),
      cuentaNombre: d.cuentaNombre ? String(d.cuentaNombre) : null,
      campania: d.campania ? String(d.campania) : null,
      medio: d.medio ? String(d.medio) : null,
    };
  } catch {
    // A campaign page must render even if this lookup fails. Losing the
    // greeting is a worse page; throwing is no page at all, in a tab somebody
    // opened from a cold email that we only get to send once.
    return null;
  }
}

/**
 * The code this visitor arrived on, from the cookie, when the URL no longer
 * carries it.
 *
 * The cookie is written by the middleware — Next refuses `cookies().set()`
 * during a page render, and a 500 on a page opened from a cold email is a
 * campaign that ends there. Reading it here is what lets a booking three days
 * later still trace back to the club we wrote to.
 */
export async function enlaceRecordado(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}
