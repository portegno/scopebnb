/**
 * Pricing plans — DRAFT placeholder numbers (modeled on the reference site).
 * Demo/seed content separated from UI. Replace with final ScopeBnB rates.
 */
export type Plan = {
  id: string;
  name: string;
  priceUsd: number;
  unit: string;
  note: string;
  features: string[];
  highlight?: boolean;
};

export const nightlyPlans: Plan[] = [
  {
    id: "standard",
    name: "Standard Night",
    priceUsd: 79,
    unit: "/ night",
    note: "Full night of managed imaging",
    features: ["Full-night acquisition", "Color or L-Extreme narrowband", "Raw FITS + calibration frames", "Next-day delivery"],
  },
  {
    id: "newmoon",
    name: "New Moon",
    priceUsd: 129,
    unit: "/ night",
    note: "Optimal dark-sky conditions",
    features: ["Maximum darkness", "Priority scheduling", "Full-night acquisition", "Raw FITS + calibration frames"],
    highlight: true,
  },
  {
    id: "student",
    name: "Student",
    priceUsd: 69,
    unit: "/ night",
    note: "Discounted rate with valid student ID",
    features: ["Full-night acquisition", "Raw FITS data", "Same delivery guarantee"],
  },
];

export const packages: Plan[] = [
  {
    id: "pack7",
    name: "7 Nights",
    priceUsd: 549,
    unit: "package",
    note: "≈ $78 / night · valid 6 months",
    features: ["Complete date flexibility", "Priority support", "Great for medium projects"],
  },
  {
    id: "pack20",
    name: "20 Nights",
    priceUsd: 1499,
    unit: "package",
    note: "≈ $74 / night · valid 12 months",
    features: ["Best per-night value", "Priority support", "Great for long projects"],
  },
];
