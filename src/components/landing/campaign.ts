/**
 * The campaign a visitor arrived on.
 *
 * Verónica's outbound link carries `utm_source=<account id>` — it's built by
 * `enlace_para_una_cuenta` on the agency side, and the account id is a slug
 * (`club-astronomico-cordoba`). That single parameter is the only real edge
 * outbound has over cold traffic: we know who is reading.
 *
 * **Every internal link has to carry it forward.** If the CTA goes to /book
 * without the query, the booking that comes out of it can't be attributed to
 * any account, and the agency's `como_le_fue_a_la_cuenta` answers nothing.
 * Nothing errors, nothing looks broken — the whole campaign is simply
 * unmeasurable. That's why this lives in one module instead of being spelled
 * out per link.
 */

/** The params worth carrying. Anything else is noise we don't need to keep. */
const CARRY = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** Turns `club-astronomico-cordoba` into `Club Astronomico Cordoba`. */
export function accountName(slug: string | null): string | null {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  // A slug is what we sent; anything else came from somewhere we don't control
  // and doesn't get printed on the page.
  if (!/^[a-z0-9-]{2,60}$/.test(clean)) return null;
  return clean
    .split("-")
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/** The tracking params of the current URL, ready to append to an internal href. */
export function carriedQuery(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const k of CARRY) {
    const v = params.get(k);
    if (v) out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

/**
 * Where a lead came from, as one string, for the `source` field of a signup.
 *
 * Goes in as `landing:<slug>:<account>` so the agency can tell a lead that came
 * from Verónica's outbound apart from one that came from the site — and which
 * account it was. Without the account, a lead is a lead; with it, it closes the
 * loop back to the club we wrote to.
 */
export function leadSource(landing: string, params: URLSearchParams): string {
  const acc = params.get("utm_source");
  return `landing:${landing}${acc ? `:${acc}` : ""}`;
}
