import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/ui";
import { BlogList } from "@/components/blog/BlogList";
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
        <BlogList posts={posts} />
      )}
    </Section>
  );
}
