import { NextResponse } from "next/server";
import { AdminError, requireAdmin, requirePermission } from "@/lib/admin/auth";
import { getPost, updatePost, deletePost } from "@/lib/blog/store";
import type { BlogPostPatch, PostStatus } from "@/lib/blog/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard(req: Request) {
  const identity = await requireAdmin(req);
  requirePermission(identity, "blog.manage");
}

function handle(e: unknown) {
  if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error("[admin] blog post route error:", e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** GET /api/admin/blog/[id] — a single post (any status). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guard(req);
    const { id } = await params;
    const post = await getPost(id);
    if (!post) throw new AdminError(404, "Post not found");
    return NextResponse.json({ post });
  } catch (e) {
    return handle(e);
  }
}

/** PATCH /api/admin/blog/[id] — update fields and/or publish state. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guard(req);
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const patch: BlogPostPatch = {};
    if (str(body.title) !== undefined) patch.title = str(body.title);
    if (str(body.slug) !== undefined) patch.slug = str(body.slug);
    if (str(body.excerpt) !== undefined) patch.excerpt = str(body.excerpt);
    if (str(body.coverImage) !== undefined) patch.coverImage = str(body.coverImage);
    if (str(body.contentHtml) !== undefined) patch.contentHtml = str(body.contentHtml);
    if (body.mikeTip && typeof body.mikeTip === "object") {
      const mt = body.mikeTip as { enabled?: unknown; html?: unknown };
      patch.mikeTip = { enabled: !!mt.enabled, html: typeof mt.html === "string" ? mt.html : "" };
    }
    if (body.status === "draft" || body.status === "published") patch.status = body.status as PostStatus;

    const post = await updatePost(id, patch);
    return NextResponse.json({ post });
  } catch (e) {
    return handle(e);
  }
}

/** DELETE /api/admin/blog/[id] — remove a post. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guard(req);
    const { id } = await params;
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handle(e);
  }
}
