import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { checkDiscount } from "@/lib/newsletter/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/discount/validate — check whether the signed-in user can use a
 * newsletter discount code, using their verified email (not a client-supplied
 * one). Read-only preview for the checkout: it never marks the code redeemed
 * (that happens server-side when the booking is actually paid/confirmed).
 */
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return NextResponse.json({ valid: false, reason: "not-signed-in" }, { status: 401 });

  let email: string | undefined;
  try {
    email = (await adminAuth.verifyIdToken(token)).email;
  } catch {
    return NextResponse.json({ valid: false, reason: "not-signed-in" }, { status: 401 });
  }
  if (!email) return NextResponse.json({ valid: false, reason: "no-email" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = (body.code ?? "").trim();
  if (!code) return NextResponse.json({ valid: false, reason: "wrong-code" }, { status: 400 });

  const result = await checkDiscount(email, code);
  return NextResponse.json(result);
}
