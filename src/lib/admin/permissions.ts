/**
 * Admin permission catalog — the granular capabilities that "permission
 * bundles" are composed of. Pure data (no Firebase), shared by server (gating
 * + redaction) and client (adaptive UI + bundle editor).
 */
export const PERMISSIONS = [
  "orders.view",
  "orders.claim",
  "orders.status",
  "orders.review",
  "calendar.block",
  "stats.view",
  "customers.view",
  "revenue.view",
  "tickets.view", // reserved for the future ticket module
  "tickets.respond", // reserved
  "blog.manage",
  "newsletter.manage",
  "team.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(v: unknown): v is Permission {
  return typeof v === "string" && (PERMISSIONS as readonly string[]).includes(v);
}

export const PERMISSION_LABEL: Record<Permission, string> = {
  "orders.view": "View orders",
  "orders.claim": "Take / release orders",
  "orders.status": "Change order status",
  "orders.review": "Mark orders reviewed",
  "calendar.block": "Block / unblock nights",
  "stats.view": "View overview metrics",
  "customers.view": "View customer contact data",
  "revenue.view": "View prices & revenue ($)",
  "tickets.view": "View support tickets",
  "tickets.respond": "Respond to tickets",
  "blog.manage": "Write & publish blog posts",
  "newsletter.manage": "See the newsletter subscribers",
  "team.manage": "Manage team & permission bundles",
};

/** Grouping for the per-user permission picker UI. */
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Orders", permissions: ["orders.view", "orders.claim", "orders.status", "orders.review"] },
  { label: "Calendar", permissions: ["calendar.block"] },
  { label: "Insights", permissions: ["stats.view", "customers.view", "revenue.view"] },
  { label: "Support (coming soon)", permissions: ["tickets.view", "tickets.respond"] },
  { label: "Content", permissions: ["blog.manage", "newsletter.manage"] },
  { label: "Administration", permissions: ["team.manage"] },
];
