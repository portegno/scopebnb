import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { isPostLevel, type BlogPost, type BlogPostPatch, type PostStatus } from "./types";

const COL = "blogPosts";

const toSeconds = (v: unknown) => (v instanceof Timestamp ? { seconds: v.seconds } : null);

/** Manual order ascending, with the most recent of a given date field first on ties. */
const byOrderThenDate = (key: "updatedAt" | "publishedAt") => (a: BlogPost, b: BlogPost) =>
  a.order - b.order || (b[key]?.seconds ?? 0) - (a[key]?.seconds ?? 0);

function serialize(id: string, d: FirebaseFirestore.DocumentData): BlogPost {
  return {
    id,
    slug: d.slug ?? id,
    title: d.title ?? "",
    excerpt: d.excerpt ?? "",
    coverImage: d.coverImage ?? "",
    contentHtml: d.contentHtml ?? "",
    mikeTip: { enabled: !!d.mikeTip?.enabled, html: d.mikeTip?.html ?? "" },
    order: typeof d.order === "number" ? d.order : 0,
    status: (d.status as PostStatus) ?? "draft",
    level: isPostLevel(d.level) ? d.level : null,
    authorEmail: d.authorEmail ?? "",
    createdAt: toSeconds(d.createdAt),
    updatedAt: toSeconds(d.updatedAt),
    publishedAt: toSeconds(d.publishedAt),
  };
}

/** kebab-case slug from a title; falls back to "post" when empty. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "post";
}

/** Make `base` unique within the collection, ignoring `exceptId` (the post itself). */
async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  let slug = base;
  for (let i = 2; ; i += 1) {
    const snap = await adminDb.collection(COL).where("slug", "==", slug).limit(1).get();
    const taken = !snap.empty && snap.docs[0].id !== exceptId;
    if (!taken) return slug;
    slug = `${base}-${i}`;
  }
}

// ---- Admin ----

export async function listPosts(): Promise<BlogPost[]> {
  const snap = await adminDb.collection(COL).get();
  return snap.docs.map((d) => serialize(d.id, d.data())).sort(byOrderThenDate("updatedAt"));
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const snap = await adminDb.doc(`${COL}/${id}`).get();
  return snap.exists ? serialize(snap.id, snap.data() ?? {}) : null;
}

/** Create an empty draft owned by `authorEmail`; returns the new post. */
export async function createDraft(authorEmail: string): Promise<BlogPost> {
  const now = FieldValue.serverTimestamp();
  const ref = await adminDb.collection(COL).add({
    slug: "",
    title: "",
    excerpt: "",
    coverImage: "",
    contentHtml: "",
    mikeTip: { enabled: false, html: "" },
    order: 0,
    status: "draft",
    authorEmail,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  });
  // Seed the slug from the doc id so the draft has a stable, unique slug.
  await ref.update({ slug: ref.id });
  return (await getPost(ref.id))!;
}

export async function updatePost(id: string, patch: BlogPostPatch): Promise<BlogPost> {
  const ref = adminDb.doc(`${COL}/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found");
  const current = serialize(snap.id, snap.data() ?? {});

  const update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (patch.title !== undefined) update.title = patch.title;
  if (patch.excerpt !== undefined) update.excerpt = patch.excerpt;
  if (patch.coverImage !== undefined) update.coverImage = patch.coverImage;
  if (patch.contentHtml !== undefined) update.contentHtml = patch.contentHtml;
  if (patch.mikeTip !== undefined) {
    update.mikeTip = { enabled: !!patch.mikeTip.enabled, html: patch.mikeTip.html ?? "" };
  }
  if (patch.level !== undefined) update.level = patch.level; // PostLevel or null (clears it)

  // Slug: explicit value, else regenerate from a new title; always kept unique.
  if (patch.slug !== undefined || patch.title !== undefined) {
    const base = slugify(patch.slug ?? patch.title ?? current.slug);
    update.slug = await uniqueSlug(base, id);
  }

  if (patch.status !== undefined && patch.status !== current.status) {
    update.status = patch.status;
  }

  // Publish time. An explicit value (epoch seconds) wins and can be in the
  // future, which schedules the post; null clears it. Otherwise, stamp the
  // current time the first time the post goes live and keep it on later edits.
  if (patch.publishedAt !== undefined) {
    update.publishedAt =
      patch.publishedAt === null ? FieldValue.delete() : Timestamp.fromMillis(patch.publishedAt * 1000);
  } else if (patch.status === "published" && !current.publishedAt) {
    update.publishedAt = FieldValue.serverTimestamp();
  }

  await ref.update(update);
  return (await getPost(id))!;
}

export async function deletePost(id: string): Promise<void> {
  await adminDb.doc(`${COL}/${id}`).delete();
}

/** Persist a manual ordering: each id's `order` becomes its index in the list. */
export async function reorderPosts(ids: string[]): Promise<void> {
  const batch = adminDb.batch();
  ids.forEach((id, i) => batch.update(adminDb.doc(`${COL}/${id}`), { order: i }));
  await batch.commit();
}

// ---- Public (published only) ----

export async function listPublished(): Promise<BlogPost[]> {
  // Single-field filter + in-memory sort avoids a composite index. Scheduled
  // posts (publishedAt in the future) are filtered out here so they surface on
  // their own, without any cron: the blog page is force-dynamic and re-reads per
  // request, so `now` advances every load.
  const now = Date.now() / 1000;
  const snap = await adminDb.collection(COL).where("status", "==", "published").get();
  return snap.docs
    .map((d) => serialize(d.id, d.data()))
    .filter((p) => (p.publishedAt?.seconds ?? 0) <= now)
    .sort(byOrderThenDate("publishedAt"));
}

export async function getPublishedBySlug(slug: string): Promise<BlogPost | null> {
  const snap = await adminDb
    .collection(COL)
    .where("slug", "==", slug)
    .where("status", "==", "published")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const post = serialize(snap.docs[0].id, snap.docs[0].data());
  // Hide a scheduled post until its publish time (slugs are unique, so limit(1)
  // is safe).
  const now = Date.now() / 1000;
  return (post.publishedAt?.seconds ?? 0) <= now ? post : null;
}
