"use client";

import { use, useEffect, useState } from "react";
import { adminFetch, AdminFetchError } from "@/lib/admin/client";
import { useAuth } from "@/lib/firebase/useAuth";
import { PostEditor } from "@/components/admin/PostEditor";
import type { BlogPost } from "@/lib/blog/types";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    adminFetch<{ post: BlogPost }>(`/api/admin/blog/${id}`)
      .then((d) => setPost(d.post))
      .catch((e) =>
        setError(
          e instanceof AdminFetchError && e.status === 404
            ? "Post not found."
            : e instanceof AdminFetchError && e.status === 403
              ? "Your account can't manage the blog."
              : "Could not load the post.",
        ),
      );
  }, [user, id]);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!post) return <p className="text-sm text-slate-500">Loading…</p>;

  return <PostEditor post={post} />;
}
