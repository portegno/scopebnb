/** FAQ entries. Demo/seed content separated from UI. */
export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "Do I need any astrophotography experience?",
    a: "No. With Managed Imaging you just pick a target and a framing, and our team handles operation, alignment, guiding and acquisition. Remote Control is the advanced option for those who want to drive the rig with N.I.N.A.",
  },
  {
    q: "What happens if the weather is bad?",
    a: "We monitor conditions up to 48 hours in advance. If your night isn't usable, it's automatically rescheduled at no extra cost. That's our weather guarantee.",
  },
  {
    q: "What file formats will I receive?",
    a: "Calibrated 16-bit FITS files plus calibration frames (darks, flats, bias) and a processed JPEG preview, delivered to your dashboard within 24 hours.",
  },
  {
    q: "Can I choose my own target?",
    a: "Yes. Browse the seasonal target list or enter any deep-sky object. Our framing tool shows whether it fits the field of view and lets you set the camera rotation.",
  },
  {
    q: "What can this rig image well?",
    a: "It's a wide-field setup (≈3° × 2° field of view), ideal for large nebulae and rich star fields rather than small, distant galaxies.",
  },
  {
    q: "Is there a subscription?",
    a: "No subscription. You only pay when you book a night, priced by how dark the sky is that evening.",
  },
];
