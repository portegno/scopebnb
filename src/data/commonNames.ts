/**
 * Catalog id → popular "marketing" name (e.g. "M 42" → "Orion Nebula").
 *
 * Used to enrich the framer's object labels so famous targets read by their
 * common name, not just their technical designation. Data only, no UI.
 *
 * Coverage = a curated list of the best-known deep-sky objects, plus every
 * name from our framing catalog (`targets.ts`) folded in automatically.
 */
import { targets } from "./targets";

/** Normalise any designation to a spaceless, upper-case key. "M 42" → "M42". */
function norm(id: string): string {
  return id.toUpperCase().replace(/MESSIER/g, "M").replace(/\s+/g, "");
}

/** Hand-curated common names (the famous ones, beyond our framing catalog). */
const CURATED: Record<string, string> = {
  // Messier
  "M1": "Crab Nebula",
  "M8": "Lagoon Nebula",
  "M16": "Eagle Nebula",
  "M17": "Omega Nebula",
  "M20": "Trifid Nebula",
  "M24": "Sagittarius Star Cloud",
  "M27": "Dumbbell Nebula",
  "M31": "Andromeda Galaxy",
  "M33": "Triangulum Galaxy",
  "M42": "Orion Nebula",
  "M43": "De Mairan's Nebula",
  "M44": "Beehive Cluster",
  "M45": "Pleiades",
  "M51": "Whirlpool Galaxy",
  "M57": "Ring Nebula",
  "M63": "Sunflower Galaxy",
  "M64": "Black Eye Galaxy",
  "M76": "Little Dumbbell Nebula",
  "M78": "Casper Nebula",
  "M81": "Bode's Galaxy",
  "M82": "Cigar Galaxy",
  "M97": "Owl Nebula",
  "M101": "Pinwheel Galaxy",
  "M104": "Sombrero Galaxy",
  "M108": "Surfboard Galaxy",
  // NGC / IC
  "NGC224": "Andromeda Galaxy",
  "NGC253": "Sculptor Galaxy",
  "NGC281": "Pacman Nebula",
  "NGC1499": "California Nebula",
  "NGC1976": "Orion Nebula",
  "NGC2024": "Flame Nebula",
  "NGC2237": "Rosette Nebula",
  "NGC2244": "Rosette Cluster",
  "NGC2264": "Christmas Tree Cluster",
  "NGC3372": "Carina Nebula",
  "NGC4565": "Needle Galaxy",
  "NGC5128": "Centaurus A",
  "NGC6302": "Butterfly Nebula",
  "NGC6543": "Cat's Eye Nebula",
  "NGC6888": "Crescent Nebula",
  "NGC6960": "Western Veil Nebula",
  "NGC6992": "Eastern Veil Nebula",
  "NGC7000": "North America Nebula",
  "NGC7293": "Helix Nebula",
  "NGC7380": "Wizard Nebula",
  "NGC7635": "Bubble Nebula",
  "NGC869": "Double Cluster",
  "NGC884": "Double Cluster",
  "IC405": "Flaming Star Nebula",
  "IC434": "Horsehead Nebula",
  "IC1318": "Sadr Region",
  "IC1396": "Elephant's Trunk Nebula",
  "IC1805": "Heart Nebula",
  "IC1848": "Soul Nebula",
  "IC5070": "Pelican Nebula",
  "IC5146": "Cocoon Nebula",
};

// Build the lookup once: curated names take priority, then fill gaps from the
// framing catalog (skipping compound ids like "NGC 869/884").
const MAP = new Map<string, string>();
for (const [k, v] of Object.entries(CURATED)) MAP.set(norm(k), v);
for (const t of targets) {
  const k = norm(t.catalog);
  if (!k.includes("/") && !MAP.has(k)) MAP.set(k, t.name);
}

/** The popular name for a designation, or null if we don't have one. */
export function commonNameFor(id: string): string | null {
  return MAP.get(norm(id)) ?? null;
}
