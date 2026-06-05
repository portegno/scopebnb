/**
 * Link to AstroBin images of a deep-sky object (simple subject search).
 * AstroBin's `?q=` entry point resolves to its subject-filtered results.
 */

/**
 * Use just the catalog designation (drop any "· Common Name" suffix) and
 * normalise to AstroBin's canonical spacing, e.g. "M27" → "M 27",
 * "NGC4565" → "NGC 4565", so the subject actually matches.
 */
function cleanSubject(s: string): string {
  return s
    .split("·")[0]
    .trim()
    .replace(/^(M|NGC|IC)\s*0*(\d)/i, (_m, p, d) => `${p.toUpperCase()} ${d}`);
}

export function astrobinUrl(subject: string): string {
  return `https://www.astrobin.com/search/?q=${encodeURIComponent(cleanSubject(subject))}`;
}
