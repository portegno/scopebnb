import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * robots.txt. Public marketing pages are open to every crawler, including the
 * AI/LLM agents that power ChatGPT, Claude, Perplexity and Google's AI answers
 * (listed explicitly so there's no ambiguity about consent). Private surfaces
 * (admin, dashboard, auth, API, checkout/cart) are disallowed everywhere.
 */
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Amazonbot",
  "Bytespider",
  "meta-externalagent",
];

const DISALLOW = ["/admin", "/api", "/dashboard", "/login", "/signup", "/checkout", "/cart"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      // Same policy, spelled out per AI agent so the grant is explicit.
      { userAgent: AI_BOTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
