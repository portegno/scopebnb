/**
 * A blog post as stored in Firestore and serialized to the client (timestamps
 * reduced to `{ seconds }`). Plain data — no Firebase imports, so it can be
 * shared by server (store) and client (editor / public pages).
 */
export type PostStatus = "draft" | "published";

/**
 * "Mike's tip" — an optional branded callout shown in the post that ties the
 * topic to ScopeBnB's own rig (RedCat 51 under Bortle 1). `html` is rich text
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
  status: PostStatus;
  authorEmail: string;
  createdAt: { seconds: number } | null;
  updatedAt: { seconds: number } | null;
  publishedAt: { seconds: number } | null;
};

/** Fields an editor can change. */
export type BlogPostPatch = Partial<
  Pick<BlogPost, "title" | "slug" | "excerpt" | "coverImage" | "contentHtml" | "mikeTip" | "status">
>;
