/**
 * The real ScopeBnB rig. Demo/seed content separated from UI.
 * Specs drive both the equipment showcase and the framer's field-of-view math.
 */
export type Spec = {
  role: string;
  name: string;
  detail: string;
  image?: string;
};

/** Optical + sensor specs used to compute the camera field of view. */
export const opticalSpecs = {
  apertureMm: 91,
  focalRatio: 4.9,
  focalLengthMm: 448, // William Optics RedCat 91 WIFD — official 448mm f/4.9
  sensor: {
    name: "Sony IMX571 (APS-C)",
    widthMm: 23.5,
    heightMm: 15.7,
    widthPx: 6248,
    heightPx: 4176,
    pixelMicrons: 3.76,
  },
} as const;

/** Approximate field of view, derived from the optics above (small-angle). */
export const fieldOfView = {
  widthDeg: +((opticalSpecs.sensor.widthMm / opticalSpecs.focalLengthMm) * (180 / Math.PI)).toFixed(2),
  heightDeg: +((opticalSpecs.sensor.heightMm / opticalSpecs.focalLengthMm) * (180 / Math.PI)).toFixed(2),
  pixelScaleArcsec: +((206.265 * opticalSpecs.sensor.pixelMicrons) / opticalSpecs.focalLengthMm).toFixed(2),
} as const;

export const equipment: Spec[] = [
  { role: "Telescope (OTA)", name: "William Optics RedCat 91 WIFD", detail: "91mm f/4.9 apochromatic refractor, wide-field", image: "/images/equipment/redcat-91.jpg" },
  { role: "Mount", name: "ZWO AM5N", detail: "Harmonic equatorial GoTo", image: "/images/equipment/am5n.jpg" },
  { role: "Main camera", name: "ZWO ASI2600MC-P25", detail: "26MP cooled one-shot color (APS-C)" },
  { role: "Rotator", name: "ZWO CAA", detail: "Motorized camera angle adjuster, frames to your chosen rotation" },
  { role: "Guiding", name: "ZWO 30F5 + ASI220 Mini", detail: "Guide scope + mono guide camera" },
  { role: "Filter wheel", name: "ZWO EFW (5-position)", detail: "Optolong L-Extreme 7nm (Hα + OIII) + clear" },
  { role: "Focuser", name: "ZWO EAF", detail: "Electronic autofocus" },
  { role: "Control", name: "ASUS NUC 15 Pro", detail: "On-site mini PC running N.I.N.A." },
  { role: "Power", name: "Pegasus Pocket Powerbox Advance Gen2", detail: "Power & USB hub" },
];

/** Total approximate gear value, shown in the showcase. */
export const gearValueUsd = 9000;

/**
 * The two filter states the rig can actually shoot. The ASI2600MC-P25 is a
 * one-shot colour camera, so there is no LRGB/SHO — only clear glass (broadband
 * true colour) or the Optolong L-Extreme dual narrowband (Hα + OIII). Drives the
 * managed-session capture-plan selector; pure config, no UI here.
 */
export type CaptureFilterDef = {
  key: "clear" | "lextreme";
  name: string;
  tagline: string; // short subtitle next to the name
  blurb: string; // what it's good for
  accent: "gold" | "accent"; // which theme colour tints the option
  subOptions: number[]; // selectable sub lengths, seconds
  defaultSub: number; // seconds
  defaultSubs: number; // desired sub count
};

export const captureFilters: CaptureFilterDef[] = [
  {
    key: "clear",
    name: "No filter",
    tagline: "clear · broadband true colour",
    blurb: "Galaxies, star clusters, dust & reflection nebulae. Best on moonless nights.",
    accent: "gold",
    subOptions: [60, 120, 180, 300],
    defaultSub: 120,
    defaultSubs: 60,
  },
  {
    key: "lextreme",
    name: "Optolong L-Extreme",
    tagline: "dual narrowband · Hα + OIII 7nm",
    blurb: "Emission nebulae, planetaries, supernova remnants. Cuts light pollution, works under moonlight.",
    accent: "accent",
    subOptions: [120, 180, 300, 600],
    defaultSub: 300,
    defaultSubs: 36,
  },
];
