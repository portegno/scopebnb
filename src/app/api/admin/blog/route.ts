import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { listPosts, createDraft } from "@/lib/blog/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/blog — list all posts (drafts + published). */
export const GET = withAdmin(async () => {
  const posts = await listPosts();
  return NextResponse.json({ posts });
}, "blog.manage");

/** POST /api/admin/blog — create an empty draft and return it. */
export const POST = withAdmin(async (_req, { identity }) => {
  const post = await createDraft(identity.email);
  return NextResponse.json({ post });
}, "blog.manage");
