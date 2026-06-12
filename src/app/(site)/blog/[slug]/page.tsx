import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui";
import { getPublishedBySlug } from "@/lib/blog/store";

export const dynamic = "force-dynamic";

// Mike has a few poses; rotate them across posts so the callout feels fresh.
// Deterministic by slug → stable per post, varied between posts.
const MIKE_IMAGES = ["/images/mike.png", "/images/mike2.png", "/images/mike3.png", "/images/mike4.png"];
function pickMike(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return MIKE_IMAGES[h % MIKE_IMAGES.length];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublishedBySlug((await params).slug);
  if (!post) return { title: "Blog" };
  return { title: post.title, description: post.excerpt || undefined };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedBySlug((await params).slug);
  if (!post) notFound();

  return (
    <Section>
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm text-muted transition-colors hover:text-foreground">
          ← All posts
        </Link>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{post.title}</h1>
        {post.excerpt && <p className="mt-3 text-lg text-muted">{post.excerpt}</p>}

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" className="mt-8 w-full rounded-[4px] ring-1 ring-hairline" />
        )}

        <div
          className={
            "mt-8 text-foreground/90 " +
            "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground " +
            "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground " +
            "[&_p]:my-4 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 " +
            "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 " +
            "[&_a]:text-accent [&_a]:underline hover:[&_a]:text-gold " +
            "[&_img]:my-6 [&_img]:rounded-[4px] [&_img]:ring-1 [&_img]:ring-hairline " +
            "[&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted " +
            "[&_figure]:my-8 [&_figure_img]:my-0 [&_figcaption]:mt-2 [&_figcaption]:text-xs [&_figcaption]:text-muted " +
            "[&_figcaption_.astro-cap]:block [&_figcaption_.astro-cap]:text-sm [&_figcaption_.astro-cap]:text-foreground/80 " +
            "[&_figcaption_.astro-cap]:mb-0.5 [&_figcaption_a]:text-accent hover:[&_figcaption_a]:text-gold"
          }
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {post.mikeTip.enabled && post.mikeTip.html && (
          <aside className="mt-12">
            <div className="overflow-hidden rounded-[6px] bg-surface ring-1 ring-accent/25">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pickMike(post.slug)}
                  alt="Mike"
                  className="mx-auto h-44 w-auto shrink-0 object-contain sm:mx-0 sm:h-60 sm:self-end"
                />
                <span aria-hidden className="hidden self-stretch border-l border-dotted border-white/20 sm:block" />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                    ★ Mike’s tip
                  </span>
                  <div
                    className={
                      "mt-3 text-sm text-foreground/90 [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-semibold " +
                      "[&_h2]:text-foreground [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_p]:my-2 [&_p]:leading-relaxed " +
                      "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 " +
                      "[&_a]:text-accent [&_a]:underline hover:[&_a]:text-gold [&_img]:my-3 [&_img]:rounded-[4px]"
                    }
                    dangerouslySetInnerHTML={{ __html: post.mikeTip.html }}
                  />
                  <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted">
                    Want to capture this yourself?{" "}
                    <Link href="/book" className="text-accent hover:text-gold">
                      Book the RedCat 91 under Bortle 1 →
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </article>
    </Section>
  );
}
