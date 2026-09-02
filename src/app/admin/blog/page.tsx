"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { LevelMeter } from "@/components/blog/LevelMeter";
import { isScheduled, type BlogPost } from "@/lib/blog/types";

const fmtDate = (t: { seconds: number } | null) =>
  t ? new Date(t.seconds * 1000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function BlogAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Captured once at mount so render stays pure (for the scheduled/published badge).
  const [nowMs] = useState(() => Date.now());

  // Drag-and-drop reordering.
  const dragId = useRef<string | null>(null); // post being dragged
  const orderRef = useRef<string[]>([]); // current id order (kept in sync for persisting)
  const moved = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    if (!user) return;
    adminFetch<{ posts: BlogPost[] }>("/api/admin/blog")
      .then((d) => {
        setPosts(d.posts);
        orderRef.current = d.posts.map((p) => p.id);
      })
      .catch((e) =>
        setError(
          e instanceof AdminFetchError && e.status === 403
            ? "Your account can't manage the blog."
            : "Could not load posts.",
        ),
      )
      .finally(() => setLoading(false));
  }, [user]);

  async function newPost() {
    setCreating(true);
    try {
      const { post } = await adminFetch<{ post: BlogPost }>("/api/admin/blog", { method: "POST" });
      router.push(`/admin/blog/${post.id}`);
    } catch (e) {
      alert(e instanceof AdminFetchError ? e.message : "Could not create post");
      setCreating(false);
    }
  }

  function reorder(overId: string) {
    const from = dragId.current;
    if (!from || from === overId) return;
    setPosts((prev) => {
      const fromIdx = prev.findIndex((p) => p.id === from);
      const overIdx = prev.findIndex((p) => p.id === overId);
      if (fromIdx === -1 || overIdx === -1 || fromIdx === overIdx) return prev;
      const next = [...prev];
      const [m] = next.splice(fromIdx, 1);
      next.splice(overIdx, 0, m);
      orderRef.current = next.map((p) => p.id);
      moved.current = true;
      return next;
    });
  }

  function onDragEnd() {
    dragId.current = null;
    setDraggingId(null);
    if (!moved.current) return;
    moved.current = false;
    setSavingOrder(true);
    adminFetch("/api/admin/blog/reorder", { method: "POST", body: JSON.stringify({ ids: orderRef.current }) })
      .catch((e) => alert(e instanceof AdminFetchError ? e.message : "Could not save order"))
      .finally(() => setSavingOrder(false));
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-background">Blog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Write posts and publish them. Drag the handle to reorder how they appear on the blog.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savingOrder && <span className="text-xs text-slate-400">Saving order…</span>}
          <button
            onClick={newPost}
            disabled={creating}
            className="rounded-[4px] bg-surface-2 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50"
          >
            {creating ? "Creating…" : "+ New post"}
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-slate-500">No posts yet. Create your first one.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="w-8 px-2 py-2" aria-hidden />
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Mike’s tip</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {posts.map((p) => (
                <tr
                  key={p.id}
                  draggable
                  onDragStart={() => {
                    dragId.current = p.id;
                    moved.current = false;
                    setDraggingId(p.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    reorder(p.id);
                  }}
                  onDragEnd={onDragEnd}
                  className={`hover:bg-slate-100 ${draggingId === p.id ? "opacity-40" : ""}`}
                >
                  <td className="cursor-grab px-2 py-3 text-center text-slate-400 active:cursor-grabbing" title="Drag to reorder">
                    ⠿
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/blog/${p.id}`} className="flex items-center gap-3">
                      {p.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverImage} alt="" className="h-9 w-16 shrink-0 rounded-[3px] object-cover ring-1 ring-slate-200" />
                      ) : (
                        <span className="grid h-9 w-16 shrink-0 place-items-center rounded-[3px] bg-slate-200 text-[10px] text-slate-400">
                          No cover
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-medium text-background hover:underline">
                          {p.title || <span className="text-slate-400">Untitled</span>}
                        </span>
                        {p.level && <LevelMeter level={p.level} className="mt-0.5 text-slate-500" />}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.mikeTip.enabled ? (
                      <span className="inline-flex items-center gap-1 rounded-[4px] bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        ★ Mike
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${
                        isScheduled(p, nowMs)
                          ? "bg-amber-100 text-amber-700"
                          : p.status === "published"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isScheduled(p, nowMs) ? "Scheduled" : p.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {isScheduled(p, nowMs) ? `→ ${fmtDate(p.publishedAt)}` : fmtDate(p.publishedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
