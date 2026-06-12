"use client";

import { auth } from "@/lib/firebase/client";

/**
 * Upload an image to Firebase Storage via the admin route and return its public
 * URL. Sends multipart/form-data (so we attach the Bearer token by hand rather
 * than via adminFetch, which forces a JSON content-type).
 */
export async function uploadBlogImage(file: File): Promise<string> {
  const user = auth?.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();

  const body = new FormData();
  body.append("file", file);

  const res = await fetch("/api/admin/blog/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}
