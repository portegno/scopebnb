/**
 * JSON-LD structured data builders. Pure functions over site config + pricing,
 * so the graph stays in sync with the real business facts. Consumed by pages
 * via the <JsonLd> component. This is what tells search engines and LLMs what
 * ScopeBnB is, where it is, what it costs, and what questions it answers.
 */
import { site } from "@/config/site";
import { NIGHT_TIERS, REMOTE_WEEK_PRICE, REMOTE_WEEK_NIGHTS, INTEGRATION_FEE } from "@/lib/pricing";
import type { Faq } from "@/data/faq";
import type { BlogPost } from "@/lib/blog/types";

const URL = site.url;
const abs = (path: string) => (path.startsWith("http") ? path : `${URL}${path}`);
const LOGO = abs("/icon.png");
const OG_IMAGE = abs("/images/hero/foto1.jpg");

const ORG_ID = `${URL}/#organization`;
const BUSINESS_ID = `${URL}/#business`;
const WEBSITE_ID = `${URL}/#website`;

const postalAddress = () => ({
  "@type": "PostalAddress",
  streetAddress: "1724 County Road 244",
  addressLocality: "Rockwood",
  addressRegion: "TX",
  postalCode: "76873",
  addressCountry: "US",
});

/** Managed imaging spans the nightly tiers; remote is a flat weekly rate. */
function offers() {
  const nightly = NIGHT_TIERS.map((t) => t.price);
  return [
    {
      "@type": "Offer",
      name: "Managed astrophotography session",
      description:
        "We frame and capture your target and deliver the session's calibrated light and calibration frames within 24 hours. Priced by how dark the sky is that night.",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: Math.min(...nightly),
        maxPrice: Math.max(...nightly),
        priceCurrency: "USD",
      },
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Remote imaging week",
      description: `Full remote control of the rig with N.I.N.A. for ${REMOTE_WEEK_NIGHTS} consecutive nights. Flat rate, the best value.`,
      price: REMOTE_WEEK_PRICE,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Integrated image add-on",
      description: "Optional: we calibrate, stack and process your data into a ready-to-stretch image.",
      price: INTEGRATION_FEE,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  ];
}

/**
 * The site-wide graph: Organization, WebSite and the physical LocalBusiness /
 * TouristAttraction with geo, address and its offer catalogue. Rendered once in
 * the root layout so it's present on every page.
 */
export function siteGraphLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: site.name,
        url: URL,
        email: site.email,
        description: site.description,
        logo: { "@type": "ImageObject", url: LOGO, width: 1000, height: 1000 },
        image: OG_IMAGE,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: URL,
        name: site.name,
        description: site.tagline,
        publisher: { "@id": ORG_ID },
        inLanguage: "en",
      },
      {
        "@type": ["LocalBusiness", "TouristAttraction"],
        "@id": BUSINESS_ID,
        name: site.name,
        url: URL,
        email: site.email,
        description: site.description,
        image: OG_IMAGE,
        logo: LOGO,
        parentOrganization: { "@id": ORG_ID },
        priceRange: "$$",
        address: postalAddress(),
        geo: {
          "@type": "GeoCoordinates",
          latitude: site.location.latitude,
          longitude: site.location.longitude,
          elevation: site.location.elevationM,
        },
        areaServed: { "@type": "Country", name: "Worldwide" },
        knowsAbout: [
          "astrophotography",
          "deep-sky imaging",
          "remote telescope rental",
          "Bortle 1 dark skies",
          "N.I.N.A.",
        ],
        makesOffer: offers(),
      },
    ],
  };
}

/** FAQPage graph from the shared FAQ data. */
export function faqLd(items: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** BlogPosting graph for a single published post. */
export function blogPostingLd(post: BlogPost) {
  const published = post.publishedAt?.seconds ? new Date(post.publishedAt.seconds * 1000).toISOString() : undefined;
  const modified = post.updatedAt?.seconds ? new Date(post.updatedAt.seconds * 1000).toISOString() : published;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.coverImage ? abs(post.coverImage) : OG_IMAGE,
    datePublished: published,
    dateModified: modified,
    mainEntityOfPage: `${URL}/blog/${post.slug}`,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}
