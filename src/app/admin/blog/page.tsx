"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/admin/ui";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import type { BlogPost } from "@/lib/blog/types";

const fmtDate = (t: { seconds: number } | null) =>
  t ? new Date(t.seconds * 1000).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function BlogAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    adminFetch<{ posts: BlogPost[] }>("/api/admin/blog")
      .then((d) => setPosts(d.posts))
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

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-background">Blog</h1>
          <p className="mt-1 text-sm text-slate-500">Write posts and publish them to the public blog.</p>
        </div>
        <button
          onClick={newPost}
          disabled={creating}
          className="rounded-[4px] bg-surface-2 px-3 py-1.5 text-sm font-semibold text-white hover:bg-surface disabled:opacity-50"
        >
          {creating ? "Creating…" : "+ New post"}
        </button>
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
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Mike’s tip</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {posts.map((p) => (
                <tr key={p.id} className="cursor-pointer hover:bg-slate-100" onClick={() => router.push(`/admin/blog/${p.id}`)}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/blog/${p.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {p.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.coverImage} alt="" className="h-9 w-16 shrink-0 rounded-[3px] object-cover ring-1 ring-slate-200" />
                      ) : (
                        <span className="grid h-9 w-16 shrink-0 place-items-center rounded-[3px] bg-slate-200 text-[10px] text-slate-400">
                          No cover
                        </span>
                      )}
                      <span className="font-medium text-background hover:underline">
                        {p.title || <span className="text-slate-400">Untitled</span>}
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
                        p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {p.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(p.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
