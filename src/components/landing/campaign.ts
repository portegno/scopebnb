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

const nombrar = (ws: string[]) =>
  ws.map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1))).join(" ");

/** Turns `club-astronomico-cordoba` into `Club Astronomico Cordoba`. */
export function accountName(slug: string | null): string | null {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  // A slug is what we sent; anything else came from somewhere we don't control
  // and doesn't get printed on the page.
  if (!/^[a-z0-9-]{2,60}$/.test(clean)) return null;
  const palabras = clean.split("-").filter(Boolean);
  // German clubs are almost all "… e.V.", and the slug flattens that to "e-v".
  // Left alone it comes back as "Volkssternwarte Langwedel e v", which is the
  // club's own name misspelled at the top of a cold page — the one place you
  // cannot afford to look careless. Eight of the first eight accounts Verónica
  // recorded end this way, so it's the common case, not an edge one.
  if (palabras.length >= 2 && palabras.at(-2) === "e" && palabras.at(-1) === "v") {
    return `${nombrar(palabras.slice(0, -2))} e.V.`;
  }
  return nombrar(palabras);
}

/**
 * An internal href with the campaign params merged into whatever it already
 * carries.
 *
 * **Merged and not appended.** Gluing `?utm_source=…` onto an href turns
 * `/book?mode=remote` into `/book?mode=remote?utm_source=…`, which navigates
 * fine, loads fine, and leaves `mode` holding a value that isn't a mode. The
 * page looks right and two parameters are wrong.
 *
 * The href's own params win: if a link deliberately sets `utm_source`, that was
 * a decision, and this shouldn't quietly overwrite it.
 */
export function conCampania(href: string, params: URLSearchParams): string {
  const [ruta, query = ""] = href.split("#")[0].split("?");
  const hash = href.includes("#") ? `#${href.split("#")[1]}` : "";
  const out = new URLSearchParams(query);
  for (const k of CARRY) {
    const v = params.get(k);
    if (v && !out.has(k)) out.set(k, v);
  }
  const s = out.toString();
  return `${ruta}${s ? `?${s}` : ""}${hash}`;
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
