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

/**
 * Topic difficulty ("Expertometer"). A public, author-controlled signal of how
 * technical a post is — not a barrier, just a heads-up. Optional: unset posts
 * show no meter.
 */
export type PostLevel = "beginner" | "intermediate" | "advanced";

export const POST_LEVELS: PostLevel[] = ["beginner", "intermediate", "advanced"];

/** Display metadata per level: friendly label + how many meter bars to fill. */
export const POST_LEVEL_META: Record<PostLevel, { label: string; short: string; steps: number }> = {
  beginner: { label: "Beginner friendly", short: "Beginner", steps: 1 },
  intermediate: { label: "Intermediate", short: "Intermediate", steps: 2 },
  advanced: { label: "Advanced", short: "Advanced", steps: 3 },
};

export function isPostLevel(v: unknown): v is PostLevel {
  return v === "beginner" || v === "intermediate" || v === "advanced";
}

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
  level: PostLevel | null; // topic difficulty ("Expertometer"); null = not set
  authorEmail: string;
  createdAt: { seconds: number } | null;
  updatedAt: { seconds: number } | null;
  publishedAt: { seconds: number } | null;
};

/** Fields an editor can change. */
export type BlogPostPatch = Partial<
  Pick<BlogPost, "title" | "slug" | "excerpt" | "coverImage" | "contentHtml" | "mikeTip" | "status" | "level">
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
