/**
 * Home hero background images that slowly cross-fade (Telescope Live style).
 *
 * These point at YOUR photos in `public/images/hero/`. Export the files from
 * Photoshop straight into that folder with the names below and they'll appear
 * automatically — no code change needed. Add/remove entries to change the cycle.
 *
 * If a file is missing it just shows the dark background; swap the list back to
 * the DSS placeholders (bottom of this file) if you ever need a fallback.
 *
 * Data only, separated from UI: <HeroBackground> simply renders this list.
 */
export type HeroImage = { src: string; alt: string };

export const heroImages: HeroImage[] = [
  { src: "/images/hero/foto1.jpg", alt: "Orion Nebula (M42) — shot on our rig" },
  { src: "/images/hero/foto2.jpg", alt: "Carina Nebula (NGC 3372) — shot on our rig" },
  { src: "/images/hero/foto3.jpg", alt: "Emission nebula — shot on our rig" },
];

// ── Fallback: real DSS2 sky imagery (no local files needed). To use it, replace
//    the array above with this one.
// import { skyThumb } from "@/lib/thumbnail";
// export const heroImages: HeroImage[] = [
//   { src: skyThumb(83.82, -5.39, 2200, 1240, 2.6), alt: "Orion Nebula (M42)" },
//   { src: skyThumb(161.26, -59.87, 2200, 1240, 3.2), alt: "Carina Nebula (NGC 3372)" },
//   { src: skyThumb(98.0, 5.05, 2200, 1240, 2.8), alt: "Rosette Nebula (NGC 2237)" },
// ];
