/**
 * Site-wide configuration: brand, navigation, location facts.
 * Pure config — no UI. Edit copy/links here.
 */
export const site = {
  name: "ScopeBnB",
  tagline: "Rent a world-class telescope under Bortle 1 skies in Texas.",
  location: {
    observatory: "Starfront Observatories",
    address: ["c/o Starfront Observatories", "1724 County Road 244", "Rockwood, TX 76873"],
    bortle: 1,
    clearNightsPerYear: 270,
    // N 31°32'50"  W 99°22'57"  ·  elevation 472 m
    latitude: 31.5472,
    longitude: -99.3825,
    elevationM: 472,
    // Central Time. CDT (UTC-5) in summer DST, CST (UTC-6) otherwise.
    utcOffset: -5,
  },
  // Mux PLAYBACK ID (public) of the explainer video shown below the hero.
  // NOT the Asset ID — get it from Mux dashboard → Asset → "Playback IDs" (public).
  // Empty string hides the video block until a real ID is set.
  explainerVideoPlaybackId: "klNQF3L5xLB2Bu3IbHkFJisA401HrhXDW3A00oNGlDOe4",
} as const;

/** Primary navigation shown in the header. */
export const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
] as const;

/** Footer link groups. */
export const footerSections = [
  {
    title: "Booking",
    links: [
      { href: "/book", label: "Book a night" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/blog", label: "Blog" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
] as const;
