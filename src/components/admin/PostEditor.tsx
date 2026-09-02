"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { uploadBlogImage } from "@/lib/blog/upload";
import { RichTextEditor } from "./RichTextEditor";
import { LevelMeter } from "@/components/blog/LevelMeter";
import { POST_LEVELS, POST_LEVEL_META, type BlogPost, type PostLevel } from "@/lib/blog/types";

const input =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-500";
const btnPrimary =
  "rounded-[4px] bg-surface-2 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50";
const btnGhost =
  "rounded-[4px] border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

const pad = (n: number) => String(n).padStart(2, "0");

/** Epoch seconds -> a value for <input type="datetime-local"> in local time. */
function toLocalInput(seconds: number): string {
  const d = new Date(seconds * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A local datetime-local string -> epoch seconds (undefined when empty/invalid). */
function fromLocalInput(value: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

const tzLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
  // Topic difficulty ("Expertometer").
  const [level, setLevel] = useState<PostLevel | null>(post.level);
  const [suggesting, setSuggesting] = useState(false);
  const [levelReason, setLevelReason] = useState<string | null>(null);
  // Publish date/time (local). Empty = publish now on publish.
  const [publishAt, setPublishAt] = useState(post.publishedAt ? toLocalInput(post.publishedAt.seconds) : "");
  // Captured once at mount so render stays pure (used to compare against the
  // chosen publish time for the Publish/Schedule label).
  const [nowMs] = useState(() => Date.now());

  const [busy, setBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save(nextStatus?: "draft" | "published") {
    setBusy(true);
    setNote(null);
    try {
      const publishedAt = fromLocalInput(publishAt);
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
          level,
          ...(publishedAt !== undefined ? { publishedAt } : {}),
        }),
      });
      setSlug(updated.slug);
      setStatus(updated.status);
      if (updated.publishedAt) setPublishAt(toLocalInput(updated.publishedAt.seconds));
      const futureNow = !!updated.publishedAt && updated.publishedAt.seconds * 1000 > Date.now();
      setNote(
        nextStatus === "draft"
          ? "Unpublished"
          : updated.status === "published" && futureNow
            ? "Scheduled ✓"
            : nextStatus === "published"
              ? "Published ✓"
              : "Saved ✓",
      );
    } catch (e) {
      setNote(e instanceof AdminFetchError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function suggestLevel() {
    setSuggesting(true);
    setLevelReason(null);
    try {
      const { level: suggested, reason } = await adminFetch<{ level: PostLevel; reason: string }>(
        "/api/admin/blog/suggest-level",
        { method: "POST", body: JSON.stringify({ title, contentHtml }) },
      );
      setLevel(suggested);
      setLevelReason(reason || null);
    } catch (e) {
      setLevelReason(e instanceof AdminFetchError ? e.message : "Could not suggest a level");
    } finally {
      setSuggesting(false);
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

  const publishSeconds = fromLocalInput(publishAt);
  const willSchedule = publishSeconds !== undefined && publishSeconds * 1000 > nowMs;
  const scheduled = status === "published" && willSchedule;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.push("/admin/blog")} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to posts
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${
              scheduled
                ? "bg-amber-100 text-amber-700"
                : status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
            }`}
          >
            {scheduled ? "Scheduled" : status === "published" ? "Published" : "Draft"}
          </span>
          {status === "published" && !scheduled && (
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
              {willSchedule ? "Schedule" : "Publish"}
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
                <span className="block text-xs text-slate-500">A SCOPEBNB tip tying this topic to the RedCat 91 under Bortle 1.</span>
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
            <label className="text-xs uppercase tracking-wider text-slate-400">Publish date &amp; time</label>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className={`${input} mt-1 w-full`}
            />
            <p className="mt-1 text-xs text-slate-400">
              {willSchedule
                ? `Will go live at the time above (${tzLabel}).`
                : `Times are ${tzLabel}. Leave empty to publish immediately; set a future time to schedule.`}
            </p>
            {publishAt && (
              <button onClick={() => setPublishAt("")} className="mt-1 text-xs text-slate-500 hover:text-slate-800">
                Clear (publish now)
              </button>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-400">Difficulty</label>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {POST_LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(level === l ? null : l)}
                  className={`rounded-[4px] px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                    level === l
                      ? "bg-surface-2 text-white ring-transparent"
                      : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {POST_LEVEL_META[l].short}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-slate-500">
                {level ? <LevelMeter level={level} /> : <span className="text-xs text-slate-400">Not set</span>}
              </span>
              <button type="button" onClick={suggestLevel} disabled={suggesting} className={btnGhost}>
                {suggesting ? "Thinking…" : "✨ Suggest"}
              </button>
            </div>
            {levelReason && <p className="mt-1 text-xs text-slate-500 italic">{levelReason}</p>}
            <p className="mt-1 text-xs text-slate-400">Topic complexity shown on the post. Optional; click a level again to clear.</p>
          </div>
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
