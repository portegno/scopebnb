import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { BlogPost, BlogPostPatch, PostStatus } from "./types";

const COL = "blogPosts";

const toSeconds = (v: unknown) => (v instanceof Timestamp ? { seconds: v.seconds } : null);

function serialize(id: string, d: FirebaseFirestore.DocumentData): BlogPost {
  return {
    id,
    slug: d.slug ?? id,
    title: d.title ?? "",
    excerpt: d.excerpt ?? "",
    coverImage: d.coverImage ?? "",
    contentHtml: d.contentHtml ?? "",
    mikeTip: { enabled: !!d.mikeTip?.enabled, html: d.mikeTip?.html ?? "" },
    status: (d.status as PostStatus) ?? "draft",
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
  return snap.docs
    .map((d) => serialize(d.id, d.data()))
    .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0));
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

  // Slug: explicit value, else regenerate from a new title; always kept unique.
  if (patch.slug !== undefined || patch.title !== undefined) {
    const base = slugify(patch.slug ?? patch.title ?? current.slug);
    update.slug = await uniqueSlug(base, id);
  }

  if (patch.status !== undefined && patch.status !== current.status) {
    update.status = patch.status;
    // Stamp publishedAt the first time it goes live; keep it on later edits.
    if (patch.status === "published" && !current.publishedAt) {
      update.publishedAt = FieldValue.serverTimestamp();
    }
  }

  await ref.update(update);
  return (await getPost(id))!;
}

export async function deletePost(id: string): Promise<void> {
  await adminDb.doc(`${COL}/${id}`).delete();
}

// ---- Public (published only) ----

export async function listPublished(): Promise<BlogPost[]> {
  // Single-field filter + in-memory sort avoids a composite index.
  const snap = await adminDb.collection(COL).where("status", "==", "published").get();
  return snap.docs
    .map((d) => serialize(d.id, d.data()))
    .sort((a, b) => (b.publishedAt?.seconds ?? 0) - (a.publishedAt?.seconds ?? 0));
}

export async function getPublishedBySlug(slug: string): Promise<BlogPost | null> {
  const snap = await adminDb
    .collection(COL)
    .where("slug", "==", slug)
    .where("status", "==", "published")
    .limit(1)
    .get();
  return snap.empty ? null : serialize(snap.docs[0].id, snap.docs[0].data());
}
