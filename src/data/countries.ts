/**
 * Country reference data for the signup / profile forms.
 * Pure data — no UI. `dial` is the E.164 calling code; we store phone numbers
 * in E.164 so SMS / WhatsApp alerts can be sent to any country.
 */
export type Country = { code: string; name: string; dial: string };

// US first — primary market. Then the Americas and a broad international set.
export const countries: Country[] = [
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "MX", name: "Mexico", dial: "+52" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "CL", name: "Chile", dial: "+56" },
  { code: "CO", name: "Colombia", dial: "+57" },
  { code: "PE", name: "Peru", dial: "+51" },
  { code: "UY", name: "Uruguay", dial: "+598" },
  { code: "EC", name: "Ecuador", dial: "+593" },
  { code: "BO", name: "Bolivia", dial: "+591" },
  { code: "PY", name: "Paraguay", dial: "+595" },
  { code: "VE", name: "Venezuela", dial: "+58" },
  { code: "CR", name: "Costa Rica", dial: "+506" },
  { code: "PA", name: "Panama", dial: "+507" },
  { code: "GT", name: "Guatemala", dial: "+502" },
  { code: "DO", name: "Dominican Republic", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "BE", name: "Belgium", dial: "+32" },
  { code: "CH", name: "Switzerland", dial: "+41" },
  { code: "AT", name: "Austria", dial: "+43" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "DK", name: "Denmark", dial: "+45" },
  { code: "FI", name: "Finland", dial: "+358" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "CZ", name: "Czechia", dial: "+420" },
  { code: "GR", name: "Greece", dial: "+30" },
  { code: "RO", name: "Romania", dial: "+40" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "IL", name: "Israel", dial: "+972" },
  { code: "TR", name: "Turkey", dial: "+90" },
];

/** E.164 calling code for an ISO country code, or "" if unknown. */
export function dialFor(code: string): string {
  return countries.find((c) => c.code === code)?.dial ?? "";
}

/**
 * Normalize a raw phone input into E.164 using the chosen country's dial code.
 * If the user already typed a leading "+", we trust it as-is.
 */
export function toE164(countryCode: string, raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "");
  const digits = trimmed.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  return `${dialFor(countryCode)}${digits}`;
}
