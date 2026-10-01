/** FAQ entries. Demo/seed content separated from UI. */
export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "Do I need any astrophotography experience?",
    a: "No. With Managed Imaging you just pick a target and a framing, and our team handles operation, alignment, guiding and acquisition. Remote Control is the advanced option for those who want to drive the rig with N.I.N.A.",
  },
  {
    q: "Do I need my own telescope or equipment?",
    a: "No. Everything runs on our professional rig under Bortle 1 skies in Texas: a wide-field William Optics RedCat 91 on a ZWO AM5N mount with a cooled color camera, driven by N.I.N.A. All you need is a web browser. With Managed Imaging we operate it for you, and with Remote Control you drive it yourself over the internet.",
  },
  {
    q: "How much does it cost to rent a remote telescope for astrophotography?",
    a: "Managed Imaging, where our team captures your target for you, runs $65 to $100 per night depending on how dark the sky is. Remote Control, where you drive the rig yourself, is sold by the block at a flat rate: $150 for 3 nights or $300 for a full week of 7 nights. A finished, integrated image is an optional $25 add-on. There is no subscription, you only pay when you book.",
  },
  {
    q: "Is there a subscription?",
    a: "No subscription. You only pay when you book. Managed Imaging is priced by how dark the sky is that night, and Remote Control is a flat rate per package of nights (3 nights or a full week).",
  },
  {
    q: "What happens if the weather is bad?",
    a: "We monitor conditions up to 48 hours in advance. If your night isn't usable, it's automatically rescheduled at no extra cost. That's our weather guarantee.",
  },
  {
    q: "What will I receive?",
    a: "The complete set of light frames from your session plus the matching calibration frames (darks and flats), as calibrated 16-bit FITS, delivered to your dashboard within 24 hours. You stack them yourself, or add an integrated image for $25.",
  },
  {
    q: "What is the integrated image add-on?",
    a: "For $25 we do the processing for you: we calibrate, stack and finish your data into a ready-to-stretch image, on top of the raw frames you already get. It's optional, only if you'd rather not process the data yourself.",
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
    q: "Where is the telescope and how dark is the sky?",
    a: "It's at Starfront Observatories in Rockwood, Texas, under Bortle 1 skies, the darkest class on the scale, with around 270 clear nights a year. You book and operate everything online from anywhere in the world.",
  },
  {
    q: "How do I book a session?",
    a: "Go to the Book page, choose Managed Imaging or Remote Control, and pick your night (or your package of nights) from the calendar. For a managed session you also choose and frame a target. There's no subscription, you pay only for what you book.",
  },
];
