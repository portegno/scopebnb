import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { AdminError, requireAdmin, requirePermission } from "@/lib/admin/auth";
import { adminBucket } from "@/lib/firebase/admin";
import { trimBlackBars } from "@/lib/blog/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80) || "image";

/**
 * POST /api/admin/blog/upload — store an image in Firebase Storage via the
 * Admin SDK (so authorization is the `blog.manage` permission, not Storage
 * rules) and return a tokenized public download URL.
 */
export async function POST(req: Request) {
  try {
    const identity = await requireAdmin(req);
    requirePermission(identity, "blog.manage");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AdminError(400, "No file uploaded");
    if (!file.type.startsWith("image/")) throw new AdminError(400, "Only images are allowed");
    if (file.size > MAX_BYTES) throw new AdminError(400, "Image must be under 8 MB");

    const token = randomUUID();
    const path = `blog/${randomUUID()}-${safeName(file.name)}`;
    // Strip any baked-in black bars (pillarbox/letterbox) before storing.
    const buffer = await trimBlackBars(Buffer.from(await file.arrayBuffer()));

    await adminBucket.file(path).save(buffer, {
      contentType: file.type,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });

    const url = `https://firebasestorage.googleapis.com/v0/b/${adminBucket.name}/o/${encodeURIComponent(
      path,
    )}?alt=media&token=${token}`;
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof AdminError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[admin] blog upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
