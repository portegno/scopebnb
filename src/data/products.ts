/**
 * The product lines of ScopeBnB. Demo/seed content, separated from UI.
 */
export type Product = {
  id: "managed" | "remote";
  name: string;
  audience: string;
  href: string;
  blurb: string;
  bullets: string[];
};

export const products: Product[] = [
  {
    id: "managed",
    name: "Managed Imaging",
    audience: "For beginners, no remote-control skills needed",
    href: "/how-it-works#managed",
    blurb:
      "Pick a target that's visible on your chosen night, frame it with a live sky preview, and our team captures the data for you.",
    bullets: [
      "Choose a target by night-sky availability",
      "Rotate the camera and preview the framing on the real sky",
      "Receive calibrated FITS files within 24h",
    ],
  },
  {
    id: "remote",
    name: "Remote Control (NINA)",
    audience: "For advanced imagers",
    href: "/how-it-works#remote",
    blurb:
      "Rent the rig and drive it yourself remotely with N.I.N.A., with full control of the sequence, just like it's in your backyard.",
    bullets: [
      "Hands-on control via N.I.N.A.",
      "Your sequences, your targets, your way",
      "Pro-grade gear under Bortle 1 skies",
    ],
  },
];
