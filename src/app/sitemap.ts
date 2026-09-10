import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { listPublished } from "@/lib/blog/store";

// Re-read per request so newly published posts appear without a rebuild.
export const dynamic = "force-dynamic";

/** XML sitemap: the public marketing pages plus every published blog post. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/book`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  let posts: MetadataRoute.Sitemap = [];
  try {
    const published = await listPublished();
    posts = published.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt?.seconds
        ? new Date(p.updatedAt.seconds * 1000)
        : p.publishedAt?.seconds
          ? new Date(p.publishedAt.seconds * 1000)
          : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch {
    // If the blog store is briefly unavailable, still serve the static sitemap.
    posts = [];
  }

  return [...staticPages, ...posts];
}
