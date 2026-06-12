import { NextResponse } from "next/server";
import { withAdmin, AdminError } from "@/lib/admin/auth";
import { reorderPosts } from "@/lib/blog/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/blog/reorder — persist a manual post ordering. Body: { ids }. */
export const POST = withAdmin(async (req) => {
  const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0) throw new AdminError(400, "No ids provided");
  await reorderPosts(ids);
  return NextResponse.json({ ok: true });
}, "blog.manage");
