"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { uploadBlogImage } from "@/lib/blog/upload";
import { RichTextEditor } from "./RichTextEditor";
import type { BlogPost } from "@/lib/blog/types";

const input =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500";
const btnPrimary =
  "rounded-[4px] bg-surface-2 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50";
const btnGhost =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function PostEditor({ post }: { post: BlogPost }) {
  const router = useRouter();
  const coverRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [coverImage, setCoverImage] = useState(post.coverImage);
  const [contentHtml, setContentHtml] = useState(post.contentHtml);
  const [mikeEnabled, setMikeEnabled] = useState(post.mikeTip.enabled);
  const [mikeHtml, setMikeHtml] = useState(post.mikeTip.html);
  const [status, setStatus] = useState(post.status);

  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save(nextStatus?: "draft" | "published") {
    setBusy(true);
    setNote(null);
    try {
      const { post: updated } = await adminFetch<{ post: BlogPost }>(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          coverImage,
          contentHtml,
          mikeTip: { enabled: mikeEnabled, html: mikeHtml },
          status: nextStatus ?? status,
        }),
      });
      setSlug(updated.slug);
      setStatus(updated.status);
      setNote(nextStatus === "published" ? "Published ✓" : nextStatus === "draft" ? "Unpublished" : "Saved ✓");
    } catch (e) {
      setNote(e instanceof AdminFetchError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
      router.push("/admin/blog");
    } catch (e) {
      setNote(e instanceof AdminFetchError ? e.message : "Could not delete");
      setBusy(false);
    }
  }

  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverBusy(true);
    try {
      setCoverImage(await uploadBlogImage(file));
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.push("/admin/blog")} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to posts
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${
              status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
            }`}
          >
            {status === "published" ? "Published" : "Draft"}
          </span>
          {status === "published" && (
            <a href={`/blog/${slug}`} target="_blank" rel="noreferrer" className={btnGhost}>
              View
            </a>
          )}
          <button onClick={() => save()} disabled={busy} className={btnGhost}>
            Save
          </button>
          {status === "published" ? (
            <button onClick={() => save("draft")} disabled={busy} className={btnGhost}>
              Unpublish
            </button>
          ) : (
            <button onClick={() => save("published")} disabled={busy} className={btnPrimary}>
              Publish
            </button>
          )}
          <button onClick={remove} disabled={busy} className="rounded-[4px] px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
            Delete
          </button>
        </div>
      </div>

      {note && <p className="text-sm text-slate-500">{note}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" className={`${input} mt-1 w-full text-base`} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Body</label>
            <div className="mt-1">
              <RichTextEditor initialHtml={post.contentHtml} onChange={setContentHtml} />
            </div>
          </div>

          {/* Mike's tip — branded ScopeBnB callout tying the topic to our rig. */}
          <div className="rounded-[4px] border border-slate-200 bg-slate-50 p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={mikeEnabled}
                onChange={(e) => setMikeEnabled(e.target.checked)}
                className="h-4 w-4 accent-surface-2"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/mike.png" alt="Mike" className="h-9 w-9 shrink-0 rounded-full object-cover object-top ring-1 ring-slate-300" />
              <span>
                <span className="block text-sm font-semibold text-slate-800">Mike’s tip</span>
                <span className="block text-xs text-slate-500">A SCOPEBNB tip tying this topic to the RedCat 51 under Bortle 1.</span>
              </span>
            </label>
            {mikeEnabled && (
              <div className="mt-3">
                <RichTextEditor initialHtml={mikeHtml} onChange={setMikeHtml} />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Slug</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="post-slug" className={`${input} mt-1 w-full`} />
            <p className="mt-1 text-xs text-slate-400">/blog/{slug || "…"}</p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Excerpt</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} placeholder="Short summary for listings and SEO." className={`${input} mt-1 w-full`} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Cover image</label>
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt="cover" className="mt-1 aspect-video w-full rounded-[4px] object-cover" />
            ) : (
              <div className="mt-1 flex aspect-video w-full items-center justify-center rounded-[4px] border border-dashed border-slate-300 text-xs text-slate-400">
                No cover
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <button onClick={() => coverRef.current?.click()} disabled={coverBusy} className={btnGhost}>
                {coverBusy ? "Uploading…" : coverImage ? "Replace" : "Upload"}
              </button>
              {coverImage && (
                <button onClick={() => setCoverImage("")} className={btnGhost}>
                  Remove
                </button>
              )}
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={onCover} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
