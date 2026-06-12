import type { Metadata } from "next";
import Link from "next/link";
import { Section, Eyebrow } from "@/components/ui";
import { listPublished } from "@/lib/blog/store";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic"; // always reflect the latest published posts

export default async function BlogIndex() {
  const posts = await listPublished();

  return (
    <Section>
      <Eyebrow>Blog</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Field notes</h1>
      <p className="mt-2 max-w-2xl text-muted">Stories, guides and updates from under Bortle 1 skies.</p>

      {posts.length === 0 ? (
        <p className="mt-10 text-muted">No posts yet — check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/blog/${p.slug}`}
              className="group overflow-hidden rounded-[4px] bg-surface ring-1 ring-hairline transition-colors hover:ring-accent/50"
            >
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video w-full bg-surface-2" />
              )}
              <div className="p-5">
                <h2 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-accent">
                  {p.title || "Untitled"}
                </h2>
                {p.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}
