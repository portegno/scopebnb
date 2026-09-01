/**
 * A blog post as stored in Firestore and serialized to the client (timestamps
 * reduced to `{ seconds }`). Plain data — no Firebase imports, so it can be
 * shared by server (store) and client (editor / public pages).
 */
export type PostStatus = "draft" | "published";

/**
 * "Mike's tip" — an optional branded callout shown in the post that ties the
 * topic to ScopeBnB's own rig (RedCat 91 under Bortle 1). `html` is rich text
 * from the same editor as the body.
 */
export type MikeTip = { enabled: boolean; html: string };

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string; // URL, empty string if none
  contentHtml: string; // sanitized-by-schema HTML from the editor
  mikeTip: MikeTip;
  order: number; // manual sort position (lower = first); ties break by date
  status: PostStatus;
  authorEmail: string;
  createdAt: { seconds: number } | null;
  updatedAt: { seconds: number } | null;
  publishedAt: { seconds: number } | null;
};

/** Fields an editor can change. */
export type BlogPostPatch = Partial<
  Pick<BlogPost, "title" | "slug" | "excerpt" | "coverImage" | "contentHtml" | "mikeTip" | "status">
> & {
  /**
   * Explicit publish instant as epoch SECONDS (or null to clear). A time in the
   * future schedules the post: it stays `status: "published"` but is hidden from
   * the public until that moment (see `listPublished`). Omitted means "stamp now
   * the first time it goes live", the previous behavior.
   */
  publishedAt?: number | null;
};

/**
 * True when a published post's publish time is still in the future. `nowMs` is
 * passed in (not read here) so callers control it and render stays pure.
 */
export function isScheduled(post: Pick<BlogPost, "status" | "publishedAt">, nowMs: number): boolean {
  return post.status === "published" && !!post.publishedAt && post.publishedAt.seconds * 1000 > nowMs;
}
